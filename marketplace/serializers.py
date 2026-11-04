import json
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Listing, CartItem, Order, OrderItem
from components.models import Component
from components.serializers import ComponentSerializer

User = get_user_model()


class JSONDictField(serializers.JSONField):
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                pass
        return data


class ListingSerializer(serializers.ModelSerializer):
    component = ComponentSerializer(read_only=True)
    component_id = serializers.PrimaryKeyRelatedField(
        queryset=Component.objects.all(), write_only=True, required=False, allow_null=True
    )
    new_component = JSONDictField(write_only=True, required=False)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)
    description = serializers.CharField(allow_blank=True, required=False, default='')

    class Meta:
        model = Listing
        fields = [
            'id', 'seller', 'seller_username', 'component', 'component_id',
            'new_component', 'price', 'condition', 'used_condition', 'is_active', 'description',
            'image', 'created_at', 'updated_at'
        ]
        read_only_fields = ['seller']

    def validate(self, attrs):
        # Handle stringified new_component from FormData
        raw_new = attrs.get('new_component')
        if isinstance(raw_new, str):
            try:
                attrs['new_component'] = json.loads(raw_new)
            except Exception:
                pass

        condition = attrs.get('condition', getattr(self.instance, 'condition', Listing.Condition.NEW))
        has_existing = 'component_id' in attrs and attrs['component_id'] is not None
        has_new = 'new_component' in attrs and bool(attrs['new_component'])

        if condition == Listing.Condition.USED and not (has_existing or has_new or self.instance):
            raise serializers.ValidationError({'component_id': 'Choose a catalogue component or provide details for a new one.'})
        used_condition = attrs.get('used_condition', getattr(self.instance, 'used_condition', ''))
        if condition == Listing.Condition.USED and not used_condition.strip():
            attrs['used_condition'] = 'Certified Open Box / Pre-owned'
        if condition == Listing.Condition.NEW and not (has_new or has_existing or self.instance):
            raise serializers.ValidationError({'new_component': 'Choose a catalogue component or provide new component details.'})
        if has_existing and has_new:
            # If both were sent, prefer component_id
            attrs.pop('new_component', None)
            has_new = False

        if has_new:
            payload = dict(attrs['new_component'])
            payload['price_avg'] = attrs.get('price', getattr(self.instance, 'price', None))
            component_serializer = ComponentSerializer(data=payload)
            component_serializer.is_valid(raise_exception=True)
            attrs['new_component'] = component_serializer.validated_data
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        component_data = validated_data.pop('new_component', None)
        component_id = validated_data.pop('component_id', None)
        uploaded_image = validated_data.get('image', None)

        if component_data is not None:
            if uploaded_image and not component_data.get('image'):
                component_data['image'] = uploaded_image
            validated_data['component'] = Component.objects.create(**component_data)
        else:
            validated_data['component'] = component_id
        validated_data['seller'] = self.context['request'].user
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        component_data = validated_data.pop('new_component', None)
        component_id = validated_data.pop('component_id', None)
        uploaded_image = validated_data.get('image', None)

        if component_data is not None:
            if uploaded_image and not component_data.get('image'):
                component_data['image'] = uploaded_image
            if instance.component.listings.exclude(pk=instance.pk).exists():
                instance.component = Component.objects.create(**component_data)
            else:
                for field, value in component_data.items():
                    setattr(instance.component, field, value)
                instance.component.save()
        elif component_id is not None:
            instance.component = component_id
        return super().update(instance, validated_data)


class CartItemSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True)
    listing_id = serializers.PrimaryKeyRelatedField(
        source='listing', queryset=Listing.objects.filter(is_active=True), write_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'listing', 'listing_id', 'quantity', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'listing', 'component_name', 'category_name', 'seller_username', 'price', 'quantity']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'total_price', 'card_holder', 'card_last4', 'status', 'created_at', 'items']
        read_only_fields = ['id', 'total_price', 'status', 'created_at', 'items']
