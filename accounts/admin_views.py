from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db.models import Q
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from accounts.roles import role_for_user
from marketplace.models import Listing
from chat.models import ChatRoom
from builder.models import Build
from components.models import Component

User = get_user_model()


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            role_for_user(request.user) == 'Admin'
        )


class AdminStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response({
            'total_listings': Listing.objects.count(),
            'active_listings': Listing.objects.filter(is_active=True).count(),
            'total_chats': ChatRoom.objects.count(),
            'active_chats': ChatRoom.objects.filter(messages__isnull=False).distinct().count(),
            'total_builds': Build.objects.count(),
            'total_users': User.objects.count(),
            'total_components': Component.objects.count(),
        })


class AdminUsersListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        queryset = User.objects.all().order_by('-date_joined')
        if search:
            if search.isdigit():
                queryset = queryset.filter(Q(username__icontains=search) | Q(id=int(search)))
            else:
                queryset = queryset.filter(username__icontains=search)

        users_data = []
        for user in queryset[:60]:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or '—',
                'role': role_for_user(user),
                'is_active': user.is_active,
                'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M'),
                'is_self': user.id == request.user.id,
            })
        return Response(users_data)


class AdminUserRoleView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role', '').strip()
        if target_user.is_superuser:
            return Response({'detail': 'Superuser role cannot be modified.'}, status=status.HTTP_400_BAD_REQUEST)

        manager_group, _ = Group.objects.get_or_create(name='Manager')
        if new_role == 'Manager':
            target_user.groups.add(manager_group)
        elif new_role in ['Buyer', 'User']:
            target_user.groups.remove(manager_group)
        else:
            return Response({'detail': f'Unsupported role: {new_role}'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'role': role_for_user(target_user),
            'detail': f'User {target_user.username} role updated to {role_for_user(target_user)}.'
        })


class AdminUserToggleBlockView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == request.user.id:
            return Response({'detail': 'You cannot block your own admin account.'}, status=status.HTTP_400_BAD_REQUEST)
        if target_user.is_superuser:
            return Response({'detail': 'Cannot block a superuser.'}, status=status.HTTP_400_BAD_REQUEST)

        target_user.is_active = not target_user.is_active
        target_user.save(update_fields=['is_active'])

        action = 'unblocked' if target_user.is_active else 'blocked'
        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'is_active': target_user.is_active,
            'detail': f'User {target_user.username} successfully {action}.'
        })


class AdminBroadcastView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        title = request.data.get('title', '').strip() or 'Системное уведомление'
        message = request.data.get('message', '').strip()
        level = request.data.get('level', 'info').strip()

        if not message:
            return Response({'detail': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'broadcasts',
                {
                    'type': 'global_broadcast',
                    'title': title,
                    'message': message,
                    'level': level,
                    'timestamp': timezone.now().isoformat(),
                }
            )

        return Response({
            'success': True,
            'detail': 'Broadcast notification sent to all connected users.'
        })
