from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message
from marketplace.serializers import ListingSerializer
from marketplace.models import Listing

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    voice_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_username', 'text',
            'voice_file', 'voice_url', 'voice_duration',
            'created_at', 'is_read'
        ]
        read_only_fields = ['sender', 'voice_url']

    def get_voice_url(self, obj):
        if obj.voice_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.voice_file.url)
            return obj.voice_file.url
        return None


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
