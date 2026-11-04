from django.db import models
from django.conf import settings
from marketplace.models import Listing


class ChatRoom(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_rooms'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_buyer'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_seller'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        listing_str = f" for {self.listing.component.name}" if self.listing else ""
        return f"Chat: {self.buyer.username} <-> {self.seller.username}{listing_str}"

    class Meta:
        unique_together = ['buyer', 'seller', 'listing']


class Message(models.Model):
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    text = models.TextField(blank=True, default='')
    image = models.FileField(upload_to='chat_images/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    voice_file = models.FileField(upload_to='chat_voices/', null=True, blank=True)
    voice_duration = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_read: bool = models.BooleanField(default=False)

    def __str__(self) -> str:
        preview = (
            self.text[:50]
            if self.text
            else (
                f"[Image: {self.attachment_name or self.image.name}]"
                if self.image
                else (f"[Voice: {self.voice_duration}]" if self.voice_file else "")
            )
        )
        return f"{self.sender.username}: {preview}"

    class Meta:
        ordering = ['created_at']
