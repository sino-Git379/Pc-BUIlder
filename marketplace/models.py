from django.db import models
from django.conf import settings
from components.models import Component


class Listing(models.Model):
    class Condition(models.TextChoices):
        NEW = 'new', 'New'
        USED = 'used', 'Used'

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='listings'
    )
    component = models.ForeignKey(
        Component,
        on_delete=models.CASCADE,
        related_name='listings'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    condition: str = models.CharField(
        max_length=10,
        choices=Condition.choices,
        default=Condition.NEW
    )
    used_condition = models.CharField(max_length=120, blank=True, default='')
    image = models.ImageField(upload_to='listings/', null=True, blank=True)
    is_active: bool = models.BooleanField(default=True)
    description: str = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.component.name} - ${self.price} by {self.seller.username}"


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart_items')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'listing'], name='unique_user_listing_cart_item')]

    def __str__(self) -> str:
        return f"{self.user.username}: {self.listing} × {self.quantity}"


class Order(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_holder = models.CharField(max_length=120, blank=True, default='')
    card_last4 = models.CharField(max_length=4, blank=True, default='4242')
    status = models.CharField(max_length=20, default='paid')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Order #{self.pk} by {self.user.username} (${self.total_price})"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items'
    )
    component_name = models.CharField(max_length=255)
    category_name = models.CharField(max_length=120, blank=True, default='')
    seller_username = models.CharField(max_length=150, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self) -> str:
        return f"{self.component_name} × {self.quantity} (${self.price})"
