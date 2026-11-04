from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message
from marketplace.serializers import ListingSerializer
from marketplace.models import Listing

User = get_user_model()


def build_full_media_url(file_field, request=None):
    if not file_field:
        return None
    try:
        rel_url = file_field.url
    except Exception:
        return None
    if not rel_url.startswith('/'):
        rel_url = f'/{rel_url}'
    if request:
        abs_url = request.build_absolute_uri(rel_url)
        if 'student3.softclub.tj' in abs_url and abs_url.startswith('http://'):
            abs_url = 'https://' + abs_url[len('http://'):]
        return abs_url
    return rel_url


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    voice_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_username', 'text',
            'image', 'image_url', 'attachment_name',
            'voice_file', 'voice_url', 'voice_duration',
            'created_at', 'is_read'
        ]
        read_only_fields = ['sender', 'voice_url', 'image_url']

    def get_voice_url(self, obj):
        return build_full_media_url(obj.voice_file, self.context.get('request'))

    def get_image_url(self, obj):
        return build_full_media_url(obj.image, self.context.get('request'))


class ChatRoomSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    listing = ListingSerializer(read_only=True)
    listing_id = serializers.PrimaryKeyRelatedField(source='listing', queryset=Listing.objects.all(), write_only=True, required=True)
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'listing', 'listing_id', 'buyer', 'buyer_username',
            'seller', 'seller_username', 'messages', 'created_at'
        ]
        read_only_fields = ['buyer', 'seller']

    def validate(self, attrs):
        request = self.context.get('request')
        listing = attrs.get('listing')
        if request and request.user.is_authenticated and listing and listing.seller_id == request.user.id:
            raise serializers.ValidationError({'listing_id': 'You cannot start a chat with yourself.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        validated_data['buyer'] = request.user
        listing = validated_data.get('listing')
        validated_data['seller'] = listing.seller
        room, _ = ChatRoom.objects.get_or_create(
            buyer=validated_data['buyer'],
            seller=validated_data['seller'],
            listing=listing,
        )
        return room
