from decimal import Decimal
from asgiref.sync import async_to_sync
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APIClient
from components.models import Category, Component
from marketplace.models import Listing
from chat.models import ChatRoom, Message
from chat.serializers import ChatRoomSerializer
from chat.consumers import ChatConsumer

User = get_user_model()


class ChatIntegrationTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username='seller1', password='pass')
        self.buyer = User.objects.create_user(username='buyer1', password='pass')
        self.cat = Category.objects.create(name='Процессоры', slug='processors')
        self.comp = Component.objects.create(
            category=self.cat, brand='AMD', name='Ryzen 5 7600',
            socket='AM5', ram_type='DDR5', tdp=65, price_avg=Decimal('199.00')
        )
        self.listing = Listing.objects.create(
            component=self.comp, seller=self.seller, price=Decimal('179.00'),
            condition=Listing.Condition.NEW, is_active=True, description='Test'
        )

    def test_create_chat_room(self):
        factory = APIRequestFactory()
        req = factory.post('/api/chat/rooms/')
        req.user = self.buyer

        serializer = ChatRoomSerializer(data={'listing_id': self.listing.id}, context={'request': req})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        room = serializer.save()

        self.assertEqual(room.buyer, self.buyer)
        self.assertEqual(room.seller, self.seller)
        self.assertEqual(room.listing, self.listing)

    def test_cannot_chat_with_self(self):
        factory = APIRequestFactory()
        req = factory.post('/api/chat/rooms/')
        req.user = self.seller

        serializer = ChatRoomSerializer(data={'listing_id': self.listing.id}, context={'request': req})
        self.assertFalse(serializer.is_valid())
        self.assertIn('listing_id', serializer.errors)

    def test_unread_count_and_mark_read(self):
        room = ChatRoom.objects.create(
            buyer=self.buyer, seller=self.seller, listing=self.listing
        )
        Message.objects.create(room=room, sender=self.buyer, text="Hello seller!")
        Message.objects.create(room=room, sender=self.buyer, text="Is it available?")

        seller_client = APIClient()
        seller_client.force_authenticate(user=self.seller)

        res = seller_client.get('/api/chat/unread/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('unread_count'), 2)

        res = seller_client.post('/api/chat/mark_read/', {'room_id': room.id}, format='json')
        self.assertEqual(res.status_code, 200)

        res = seller_client.get('/api/chat/unread/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('unread_count'), 0)

    def test_websocket_consumer_multiple_messages_no_async_error(self):
        room = ChatRoom.objects.create(
            buyer=self.buyer, seller=self.seller, listing=self.listing
        )
        consumer = ChatConsumer()
        consumer.room_id = room.id

        # Send multiple messages in async context to verify no SynchronousOnlyOperation occurs
        res1 = async_to_sync(consumer.save_message_and_prepare_events)(self.buyer.id, "First message")
        res2 = async_to_sync(consumer.save_message_and_prepare_events)(self.seller.id, "Second message reply")
        res3 = async_to_sync(consumer.save_message_and_prepare_events)(self.buyer.id, "Third message")

        self.assertIsNotNone(res1)
        self.assertIsNotNone(res2)
        self.assertIsNotNone(res3)
        self.assertEqual(res1['recipient_id'], self.seller.id)
        self.assertEqual(res2['recipient_id'], self.buyer.id)
        self.assertEqual(res3['unread_count'], 2)
        self.assertEqual(Message.objects.filter(room=room).count(), 3)

    def test_send_and_retrieve_voice_message_rest(self):
        room = ChatRoom.objects.create(
            buyer=self.buyer, seller=self.seller, listing=self.listing
        )
        client = APIClient()
        client.force_authenticate(user=self.buyer)

        # Send voice message with base64 audio payload
        sample_b64 = "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8="
        res = client.post(
            f'/api/chat/rooms/{room.id}/messages/',
            {'voice_base64': sample_b64, 'voice_duration': '0:04'},
            format='json'
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn('voice_url', res.data)
        self.assertIsNotNone(res.data['voice_url'])
        self.assertEqual(res.data['voice_duration'], '0:04')

        # Retrieve room messages upon reload
        seller_client = APIClient()
        seller_client.force_authenticate(user=self.seller)
        get_res = seller_client.get(f'/api/chat/rooms/{room.id}/messages/')
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(len(get_res.data), 1)
        self.assertIsNotNone(get_res.data[0]['voice_url'])
        self.assertEqual(get_res.data[0]['voice_duration'], '0:04')

    def test_send_voice_message_consumer(self):
        room = ChatRoom.objects.create(
            buyer=self.buyer, seller=self.seller, listing=self.listing
        )
        consumer = ChatConsumer()
        consumer.room_id = room.id

        sample_b64 = "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8="
        res = async_to_sync(consumer.save_message_and_prepare_events)(
            self.buyer.id, "", voice_base64=sample_b64, voice_duration="0:06"
        )
        self.assertIsNotNone(res)
        self.assertIsNotNone(res.get('voice_url'))
        self.assertEqual(res.get('voice_duration'), "0:06")
        self.assertEqual(Message.objects.filter(room=room).count(), 1)
        msg = Message.objects.get(room=room)
        self.assertTrue(bool(msg.voice_file))
        self.assertEqual(msg.voice_duration, "0:06")
