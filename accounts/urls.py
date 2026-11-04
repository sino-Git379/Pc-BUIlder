from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from .views import RegisterView, LogoutView, CurrentUserView
from .admin_views import (
    AdminStatsView,
    AdminUsersListView,
    AdminUserRoleView,
    AdminUserToggleBlockView,
    AdminBroadcastView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # Admin endpoints
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/users/', AdminUsersListView.as_view(), name='admin-users-list'),
    path('admin/users/<int:user_id>/set_role/', AdminUserRoleView.as_view(), name='admin-user-set-role'),
    path('admin/users/<int:user_id>/toggle_block/', AdminUserToggleBlockView.as_view(), name='admin-user-toggle-block'),
    path('admin/broadcast/', AdminBroadcastView.as_view(), name='admin-broadcast'),
]
