from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Build, BuildItem
from components.serializers import ComponentSerializer
from .services import validate_build_compatibility

User = get_user_model()


class BuildItemSerializer(serializers.ModelSerializer):
    component = ComponentSerializer(read_only=True)
    component_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = BuildItem
        fields = ['id', 'component', 'component_id', 'quantity']


class BuildSerializer(serializers.ModelSerializer):
    items = BuildItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    compatibility_errors = serializers.SerializerMethodField()

    class Meta:
        model = Build
        fields = [
            'id', 'user', 'username', 'title', 'is_public',
            'items', 'compatibility_errors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user']

    def get_compatibility_errors(self, obj: Build) -> list[str]:
        return validate_build_compatibility(obj)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
