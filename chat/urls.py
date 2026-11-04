from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, UnreadCountView, MarkReadView

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')

urlpatterns = [
    path('unread/', UnreadCountView.as_view(), name='chat-unread-count'),
    path('mark_read/', MarkReadView.as_view(), name='chat-mark-read'),
    path('', include(router.urls)),
]
