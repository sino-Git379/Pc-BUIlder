from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


class JWTQueryAuthMiddleware:
    """Allow browser WebSocket clients to authenticate with their short-lived JWT."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        if not scope.get('user') or not scope['user'].is_authenticated:
            query = parse_qs(scope.get('query_string', b'').decode())
            token = query.get('token', [None])[0]
            if token:
                try:
                    access = AccessToken(token)
                    user = await self.get_user(access['user_id'])
                    if user and user.is_active:
                        scope['user'] = user
                except (InvalidToken, TokenError, KeyError, ValueError):
                    pass
        return await self.app(scope, receive, send)

    @staticmethod
    @sync_to_async
    def get_user(user_id):
        User = get_user_model()
        return User.objects.filter(pk=user_id).first()
