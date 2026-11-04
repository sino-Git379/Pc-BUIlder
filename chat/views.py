import base64
import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).select_related('buyer', 'seller', 'listing__component').prefetch_related('messages')

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        room = self.get_object()
        room.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        messages = room.messages.all()
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    @messages.mapping.post
    def send_message(self, request, pk=None):
        room = self.get_object()
        text = str(request.data.get('text', '') or '').strip()
        voice_duration = str(request.data.get('voice_duration', '') or '').strip()
        voice_file = request.FILES.get('voice_file')
        voice_base64 = request.data.get('voice_base64')

        if not voice_file and voice_base64:
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

        if not text and not voice_file:
            return Response({'text': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        if not text and voice_file:
            text = 'Voice Message'

        message = room.messages.create(
            sender=request.user,
            text=text,
            voice_file=voice_file,
            voice_duration=voice_duration
        )

        voice_url = request.build_absolute_uri(message.voice_file.url) if message.voice_file else None

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'chat_{room.id}',
                {
                    'type': 'chat_message',
                    'message_id': message.id,
                    'room_id': room.id,
                    'message': message.text,
                    'sender': request.user.username,
                    'sender_id': request.user.id,
                    'voice_url': voice_url,
                    'voice_duration': message.voice_duration,
                    'timestamp': message.created_at.isoformat(),
                }
            )

            recipient = room.seller if room.buyer == request.user else room.buyer
            if recipient:
                unread_count = Message.objects.filter(
                    (Q(room__buyer=recipient) | Q(room__seller=recipient)),
                    is_read=False
                ).exclude(sender=recipient).count()

                comp_name = ''
                if room.listing and room.listing.component:
                    comp = room.listing.component
                    comp_name = f"{comp.brand} {comp.name}".strip()

                async_to_sync(channel_layer.group_send)(
                    f'user_{recipient.id}',
                    {
                        'type': 'unread_update',
                        'unread_count': unread_count,
                    }
                )
                async_to_sync(channel_layer.group_send)(
                    f'user_{recipient.id}',
                    {
                        'type': 'chat_notification',
                        'message_id': message.id,
                        'room_id': room.id,
                        'listing_id': room.listing_id,
                        'component_name': comp_name,
                        'message': message.text if not message.voice_file else '🎤 Voice message',
                        'sender': request.user.username,
                        'sender_id': request.user.id,
                        'voice_url': voice_url,
                        'voice_duration': message.voice_duration,
                        'unread_count': unread_count,
                        'timestamp': message.created_at.isoformat(),
                    }
                )

        return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    @action(detail=True, methods=['post', 'delete'])
    def clear_history(self, request, pk=None):
        room = self.get_object()
        deleted_count, _ = room.messages.all().delete()
        return Response({'status': 'cleared', 'room_id': room.id, 'deleted_count': deleted_count}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        room_id = room.id
        room.delete()
        return Response({'status': 'deleted', 'room_id': room_id}, status=status.HTTP_200_OK)


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            (Q(room__buyer=request.user) | Q(room__seller=request.user)),
            is_read=False
        ).exclude(sender=request.user).count()
        return Response({'unread_count': count})


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        room_id = request.data.get('room_id')
        qs = Message.objects.filter(
            (Q(room__buyer=request.user) | Q(room__seller=request.user)),
            is_read=False
        ).exclude(sender=request.user)
        if room_id:
            qs = qs.filter(room_id=room_id)
        updated = qs.update(is_read=True)

        remaining = Message.objects.filter(
            (Q(room__buyer=request.user) | Q(room__seller=request.user)),
            is_read=False
        ).exclude(sender=request.user).count()

        return Response({'marked_read': updated, 'unread_count': remaining})
