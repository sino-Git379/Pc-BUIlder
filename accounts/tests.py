from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient
from rest_framework import status

from accounts.roles import role_for_user

User = get_user_model()


class AdminPanelApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='superadmin',
            email='admin@pcforge.local',
            password='Password123!'
        )
        self.buyer = User.objects.create_user(
            username='regular_buyer',
            email='buyer@pcforge.local',
            password='Password123!'
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)

        self.buyer_client = APIClient()
        self.buyer_client.force_authenticate(user=self.buyer)

    def test_non_admin_forbidden(self):
        res = self.buyer_client.get('/api/auth/admin/stats/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_stats(self):
        res = self.admin_client.get('/api/auth/admin/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', res.data)
        self.assertIn('total_listings', res.data)
        self.assertIn('active_chats', res.data)

    def test_admin_users_list_and_search(self):
        res = self.admin_client.get('/api/auth/admin/users/?search=regular_buyer')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['username'], 'regular_buyer')

    def test_change_role_to_manager_and_back(self):
        # Promote to Manager
        res = self.admin_client.post(
            f'/api/auth/admin/users/{self.buyer.id}/set_role/',
            {'role': 'Manager'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertEqual(role_for_user(self.buyer), 'Manager')

        # Demote back to Buyer
        res = self.admin_client.post(
            f'/api/auth/admin/users/{self.buyer.id}/set_role/',
            {'role': 'Buyer'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertEqual(role_for_user(self.buyer), 'Buyer')

    def test_toggle_block_user(self):
        # Ban user
        res = self.admin_client.post(f'/api/auth/admin/users/{self.buyer.id}/toggle_block/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_active)

        # Unban user
        res = self.admin_client.post(f'/api/auth/admin/users/{self.buyer.id}/toggle_block/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertTrue(self.buyer.is_active)

    def test_cannot_block_self(self):
        res = self.admin_client.post(f'/api/auth/admin/users/{self.admin.id}/toggle_block/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_broadcast(self):
        res = self.admin_client.post(
            '/api/auth/admin/broadcast/',
            {'message': 'System maintenance in 10 minutes', 'level': 'warning'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
