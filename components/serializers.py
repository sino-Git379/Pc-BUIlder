from rest_framework import serializers
from .models import Category, Component


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']
        read_only_fields = ['slug']


class ComponentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Component
        fields = [
            'id', 'name', 'brand', 'category', 'category_name',
            'socket', 'ram_type', 'tdp', 'power_supply', 'form_factor',
            'length_mm', 'height_mm', 'max_gpu_length_mm', 'max_cooler_height_mm',
            'price_avg', 'image', 'description', 'created_at', 'updated_at'
        ]
