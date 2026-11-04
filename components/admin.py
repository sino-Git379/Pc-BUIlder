from django.contrib import admin
from .models import Category, Component


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'price_avg', 'socket', 'ram_type', 'length_mm', 'height_mm']
    list_filter = ['category', 'brand', 'ram_type', 'form_factor']
    search_fields = ['name', 'brand', 'description']

