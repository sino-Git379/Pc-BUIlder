from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ComponentViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'components', ComponentViewSet)
router.register(r'items', ComponentViewSet, basename='component-items')

urlpatterns = [
    path('', include(router.urls)),
]
