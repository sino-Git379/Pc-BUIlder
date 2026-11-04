import json
import base64
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.core.files.base import ContentFile
from .models import ChatRoom, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        if await self.check_room_access():
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        # Support heartbeat ping/pong to keep WebSocket connection alive
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong',
                'timestamp': timezone.now().isoformat(),
            }))
            return

        message_text = str(data.get('message', '') or '').strip()
        voice_base64 = data.get('voice_base64')
        voice_duration = str(data.get('voice_duration', '') or '').strip()
        image_base64 = data.get('image_base64')
        attachment_name = str(data.get('attachment_name', '') or '').strip()

        if not message_text and not voice_base64 and not image_base64:
            return

        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            return

        result = await self.save_message_and_prepare_events(
            user.id, message_text, voice_base64, voice_duration, image_base64, attachment_name
        )
        if not result:
            return

        # Broadcast message to room group (both participants)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': result['message_id'],
                'room_id': result['room_id'],
                'message': result['message'],
                'sender': result['sender'],
                'sender_id': result['sender_id'],
                'image_url': result.get('image_url'),
                'attachment_name': result.get('attachment_name', ''),
                'voice_url': result.get('voice_url'),
                'voice_duration': result.get('voice_duration', ''),
                'timestamp': result['timestamp'],
            }
        )

        # Notify recipient's personal group for unread badge & toast popup
        if result['recipient_id']:
            await self.channel_layer.group_send(
                f"user_{result['recipient_id']}",
                {
                    'type': 'unread_update',
                    'unread_count': result['unread_count'],
                }
            )
            await self.channel_layer.group_send(
                f"user_{result['recipient_id']}",
                {
                    'type': 'chat_notification',
                    'message_id': result['message_id'],
                    'room_id': result['room_id'],
                    'listing_id': result['listing_id'],
                    'component_name': result['component_name'],
                    'message': (
                        '🎤 Voice message'
                        if result.get('voice_url')
                        else ('📷 Photo' if result.get('image_url') else result['message'])
                    ),
                    'sender': result['sender'],
                    'sender_id': result['sender_id'],
                    'image_url': result.get('image_url'),
                    'attachment_name': result.get('attachment_name', ''),
                    'voice_url': result.get('voice_url'),
                    'voice_duration': result.get('voice_duration', ''),
                    'unread_count': result['unread_count'],
                    'timestamp': result['timestamp'],
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event.get('message_id'),
            'room_id': event.get('room_id'),
            'message': event['message'],
            'sender': event['sender'],
            'sender_id': event['sender_id'],
            'image_url': event.get('image_url'),
            'attachment_name': event.get('attachment_name', ''),
            'voice_url': event.get('voice_url'),
            'voice_duration': event.get('voice_duration', ''),
            'timestamp': event['timestamp'],
        }))

    def _build_ws_media_url(self, file_field):
        if not file_field:
            return None
        try:
            rel_url = file_field.url
        except Exception:
            return None
        if not rel_url.startswith('/'):
            rel_url = f'/{rel_url}'
        scope = getattr(self, 'scope', None) or {}
        headers = dict(scope.get('headers') or [])
        host = headers.get(b'host', b'').decode('utf-8', errors='ignore').strip()
        proto = headers.get(b'x-forwarded-proto', b'').decode('utf-8', errors='ignore').strip()
        if host:
            if 'student3.softclub.tj' in host:
                proto = 'https'
            elif not proto:
                proto = 'http'
            return f"{proto}://{host}{rel_url}"
        return rel_url

    @sync_to_async
    def save_message_and_prepare_events(
        self, user_id, message_text, voice_base64=None, voice_duration='', image_base64=None, attachment_name=''
    ):
        try:
            room = ChatRoom.objects.select_related(
                'buyer', 'seller', 'listing__component'
            ).get(id=self.room_id)
            sender = User.objects.get(id=user_id)
        except (ChatRoom.DoesNotExist, User.DoesNotExist):
            return None

        if room.buyer_id != sender.id and room.seller_id != sender.id:
            return None

        voice_file = None
        if voice_base64:
            try:
                header, data_str = voice_base64.split(';base64,') if ';base64,' in voice_base64 else ('', voice_base64)
                ext = 'webm'
                if 'audio/mp4' in header or 'm4a' in header:
                    ext = 'm4a'
                elif 'audio/ogg' in header:
                    ext = 'ogg'
                elif 'audio/wav' in header:
                    ext = 'wav'
                decoded_bytes = base64.b64decode(data_str)
                voice_file = ContentFile(decoded_bytes, name=f"voice_{uuid.uuid4().hex[:8]}.{ext}")
            except Exception:
                pass

        image_file = None
        if image_base64:
            try:
                header, data_str = image_base64.split(';base64,') if ';base64,' in image_base64 else ('', image_base64)
                ext = 'png'
                if 'image/jpeg' in header or 'image/jpg' in header:
                    ext = 'jpg'
                elif 'image/webp' in header:
                    ext = 'webp'
                elif 'image/gif' in header:
                    ext = 'gif'
                decoded_bytes = base64.b64decode(data_str)
                safe_name = attachment_name or f"image_{uuid.uuid4().hex[:8]}.{ext}"
                image_file = ContentFile(decoded_bytes, name=safe_name)
                if not attachment_name:
                    attachment_name = safe_name
            except Exception:
                pass

        if not message_text and voice_file:
            message_text = 'Voice Message'

        message_obj = Message.objects.create(
            room=room,
            sender=sender,
            text=message_text,
            image=image_file,
            attachment_name=attachment_name,
            voice_file=voice_file,
            voice_duration=voice_duration
        )

        recipient = room.seller if room.buyer_id == sender.id else room.buyer
        unread_count = 0
        if recipient:
            unread_count = Message.objects.filter(
                (Q(room__buyer=recipient) | Q(room__seller=recipient)),
                is_read=False
            ).exclude(sender=recipient).count()

        comp_name = ''
        listing_id = None
        if room.listing:
            listing_id = room.listing_id
            if room.listing.component:
                comp = room.listing.component
                comp_name = f"{comp.brand} {comp.name}".strip()

        voice_url = self._build_ws_media_url(message_obj.voice_file)
        image_url = self._build_ws_media_url(message_obj.image)

        return {
            'message_id': message_obj.id,
            'room_id': room.id,
            'listing_id': listing_id,
            'component_name': comp_name,
            'message': message_obj.text,
            'sender': sender.username,
            'sender_id': sender.id,
            'recipient_id': recipient.id if recipient else None,
            'image_url': image_url,
            'attachment_name': message_obj.attachment_name,
            'voice_url': voice_url,
            'voice_duration': message_obj.voice_duration,
            'unread_count': unread_count,
            'timestamp': message_obj.created_at.isoformat(),
        }

    @sync_to_async
    def check_room_access(self):
        """Check if the current user has access to this chat room."""
        try:
            room = ChatRoom.objects.select_related('buyer', 'seller').get(id=self.room_id)
            user = self.scope.get('user')
            if not user or not user.is_authenticated:
                return False
            return room.buyer_id == user.id or room.seller_id == user.id
        except ChatRoom.DoesNotExist:
            return False


class GlobalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('broadcasts', self.channel_name)

        user = self.scope.get('user')
        if user and user.is_authenticated:
            self.user_group = f'user_{user.id}'
            await self.channel_layer.group_add(self.user_group, self.channel_name)
        else:
            self.user_group = None

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('broadcasts', self.channel_name)
        if getattr(self, 'user_group', None):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong',
                'timestamp': timezone.now().isoformat(),
            }))

    async def global_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'type': 'broadcast',
            'title': event.get('title', 'Системное уведомление'),
            'message': event.get('message', ''),
            'level': event.get('level', 'info'),
            'timestamp': event.get('timestamp', ''),
        }))

    async def unread_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'unread_update',
            'unread_count': event.get('unread_count', 0),
        }))

    async def chat_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_notification',
            'message_id': event.get('message_id'),
            'room_id': event.get('room_id'),
            'listing_id': event.get('listing_id'),
            'component_name': event.get('component_name', ''),
            'message': event.get('message', ''),
            'sender': event.get('sender', ''),
            'sender_id': event.get('sender_id'),
            'image_url': event.get('image_url'),
            'attachment_name': event.get('attachment_name', ''),
            'voice_url': event.get('voice_url'),
            'voice_duration': event.get('voice_duration', ''),
            'unread_count': event.get('unread_count', 0),
            'timestamp': event.get('timestamp', ''),
        }))
