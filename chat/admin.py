from django.contrib import admin
from .models import ChatRoom, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['created_at']


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'seller', 'listing', 'created_at']
    list_filter = ['created_at']
    search_fields = ['buyer__username', 'seller__username']
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['room', 'sender', 'text_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['text', 'sender__username']
    readonly_fields = ['created_at']

    def text_preview(self, obj):
        return obj.text[:50]
    text_preview.short_description = 'Text'

