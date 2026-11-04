from django.contrib import admin
from .models import Listing, Order, OrderItem


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['component', 'seller', 'price', 'condition', 'is_active', 'created_at']
    list_filter = ['condition', 'is_active', 'created_at']
    search_fields = ['component__name', 'seller__username', 'description']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_price', 'card_holder', 'card_last4', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    inlines = [OrderItemInline]
