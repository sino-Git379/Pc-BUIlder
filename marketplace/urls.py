from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ListingViewSet, CartItemViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'listings', ListingViewSet)
router.register(r'cart', CartItemViewSet, basename='cart-item')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
