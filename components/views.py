from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Component
from .serializers import CategorySerializer, ComponentSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ComponentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Component.objects.select_related('category').all()
    serializer_class = ComponentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'socket', 'ram_type', 'form_factor']
    search_fields = ['name', 'brand', 'description']
