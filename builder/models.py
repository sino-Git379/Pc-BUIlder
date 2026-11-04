from django.db import models
from django.conf import settings
from components.models import Component


class Build(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='builds'
    )
    title: str = models.CharField(max_length=200)
    is_public: bool = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.username}'s build: {self.title}"


class BuildItem(models.Model):
    build = models.ForeignKey(
        Build,
        on_delete=models.CASCADE,
        related_name='items'
    )
    component = models.ForeignKey(
        Component,
        on_delete=models.CASCADE
    )
    quantity: int = models.IntegerField(default=1)

    def __str__(self) -> str:
        return f"{self.component.name} x{self.quantity}"

