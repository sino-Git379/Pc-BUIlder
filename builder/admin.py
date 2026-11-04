from django.contrib import admin
from .models import Build, BuildItem


class BuildItemInline(admin.TabularInline):
    model = BuildItem
    extra = 0


@admin.register(Build)
class BuildAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'is_public', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['title', 'user__username']
    inlines = [BuildItemInline]

