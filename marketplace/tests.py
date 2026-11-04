from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from components.models import Category, Component
from marketplace.models import Listing, CartItem, Order

User = get_user_model()


class MarketplaceCartAndCheckoutTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username='seller_user', password='Password123!')
        self.buyer = User.objects.create_user(username='buyer_user', password='Password123!')
        self.category = Category.objects.create(name='Видеокарты', slug='gpus')
        self.component = Component.objects.create(
            category=self.category,
            brand='NVIDIA',
            name='RTX 4070 Super',
            tdp=220,
            length_mm=267,
            price_avg=Decimal('599.00')
        )
        self.listing = Listing.objects.create(
            seller=self.seller,
            component=self.component,
            price=Decimal('580.00'),
            condition=Listing.Condition.NEW,
            is_active=True,
            description='Brand new GPU'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.buyer)

    def test_add_to_cart_and_checkout_creates_order_and_clears_cart(self):
        # 1. Add item to cart (quantity 2)
        res = self.client.post(
            '/api/marketplace/cart/',
            {'listing_id': self.listing.id, 'quantity': 2},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartItem.objects.filter(user=self.buyer).count(), 1)

        # 2. Checkout with fake/test card details
        checkout_res = self.client.post(
            '/api/marketplace/orders/',
            {
                'card_number': '1111 2222 3333 9876',
                'card_expiry': '09/29',
                'card_cvv': '123',
                'card_holder': 'TEST BUYER'
            },
            format='json'
        )
        self.assertEqual(checkout_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(checkout_res.data['total_price']), Decimal('1160.00'))
        self.assertEqual(checkout_res.data['card_last4'], '9876')
        self.assertEqual(len(checkout_res.data['items']), 1)
        self.assertEqual(checkout_res.data['items'][0]['quantity'], 2)

        # 3. Verify cart is now empty
        self.assertEqual(CartItem.objects.filter(user=self.buyer).count(), 0)

        # 4. Verify order appears in user's order history
        history_res = self.client.get('/api/marketplace/orders/')
        self.assertEqual(history_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_res.data), 1)
        self.assertEqual(Order.objects.filter(user=self.buyer).count(), 1)

    def test_checkout_with_empty_cart_returns_400(self):
        res = self.client.post('/api/marketplace/orders/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_direct_escrow_offer_checkout_and_spa_routes(self):
        res = self.client.post(
            '/api/marketplace/orders/',
            {
                'card_holder': 'ALEX K.',
                'card_number': '4532 8910 4421 8892',
                'offer_total': '551.00',
                'items': [
                    {
                        'listing_id': self.listing.id,
                        'price': '551.00',
                        'quantity': 1,
                    }
                ],
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(res.data['total_price']), Decimal('551.00'))
        self.assertEqual(res.data['card_last4'], '8892')

        # Verify SPA HTML routes render 200 OK
        for route in ('/', '/checkout/', '/messages/', '/builder/'):
            page_res = self.client.get(route)
            self.assertEqual(page_res.status_code, 200)
            self.assertIn(b'id="root"', page_res.content)


class MarketplaceRBACAndCleanStateTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import Group
        self.manager_group, _ = Group.objects.get_or_create(name='Manager')

        self.buyer = User.objects.create_user(username='plain_buyer', password='Password123!')

        self.manager_a = User.objects.create_user(username='manager_alice', password='Password123!')
        self.manager_a.groups.add(self.manager_group)

        self.manager_b = User.objects.create_user(username='manager_bob', password='Password123!')
        self.manager_b.groups.add(self.manager_group)

        self.admin = User.objects.create_superuser(username='super_admin', password='Password123!', email='admin@test.com')

        self.category = Category.objects.create(name='Процессоры', slug='processors')
        self.component = Component.objects.create(
            category=self.category,
            brand='AMD',
            name='Ryzen 7 7800X3D',
            socket='AM5',
            tdp=120,
            price_avg=Decimal('449.00')
        )
        self.listing_a = Listing.objects.create(
            seller=self.manager_a,
            component=self.component,
            price=Decimal('430.00'),
            condition=Listing.Condition.NEW,
            is_active=True,
            description='Sealed Ryzen 7800X3D'
        )
        self.client = APIClient()

    def test_buyer_cannot_create_or_manage_listings(self):
        self.client.force_authenticate(user=self.buyer)

        # 1. Buyer cannot create listing (403)
        res = self.client.post('/api/marketplace/listings/', {
            'component_id': self.component.id,
            'price': '440.00',
            'condition': 'new',
            'description': 'Buyer attempt',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Buyer cannot access /mine/ (403)
        res = self.client.get('/api/marketplace/listings/mine/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Buyer cannot edit listing (403)
        res = self.client.patch(f'/api/marketplace/listings/{self.listing_a.id}/', {
            'price': '410.00'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Buyer cannot delete listing (403)
        res = self.client.delete(f'/api/marketplace/listings/{self.listing_a.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create_and_manage_own_listing_only(self):
        self.client.force_authenticate(user=self.manager_a)

        # Manager A can view own listings via /mine/
        mine_res = self.client.get('/api/marketplace/listings/mine/')
        self.assertEqual(mine_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mine_res.data), 1)

        # Manager A can create a listing
        create_res = self.client.post('/api/marketplace/listings/', {
            'component_id': self.component.id,
            'price': '425.00',
            'condition': 'new',
            'description': 'Manager A item',
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_listing_id = create_res.data['id']

        # Manager A can update own listing
        patch_res = self.client.patch(f'/api/marketplace/listings/{new_listing_id}/', {
            'price': '419.00'
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # Manager B tries to edit Manager A's listing (403 Forbidden)
        self.client.force_authenticate(user=self.manager_b)
        patch_other_res = self.client.patch(f'/api/marketplace/listings/{new_listing_id}/', {
            'price': '300.00'
        }, format='json')
        self.assertEqual(patch_other_res.status_code, status.HTTP_403_FORBIDDEN)

        # Manager B tries to delete Manager A's listing (403 Forbidden)
        del_other_res = self.client.delete(f'/api/marketplace/listings/{new_listing_id}/')
        self.assertEqual(del_other_res.status_code, status.HTTP_403_FORBIDDEN)

        # Manager A can delete own listing
        self.client.force_authenticate(user=self.manager_a)
        del_res = self.client.delete(f'/api/marketplace/listings/{new_listing_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_manage_any_listing(self):
        self.client.force_authenticate(user=self.admin)

        # Admin edits Manager A's listing
        patch_res = self.client.patch(f'/api/marketplace/listings/{self.listing_a.id}/', {
            'price': '399.00'
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.listing_a.refresh_from_db()
        self.assertEqual(self.listing_a.price, Decimal('399.00'))

        # Admin deletes Manager A's listing
        del_res = self.client.delete(f'/api/marketplace/listings/{self.listing_a.id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Listing.objects.filter(id=self.listing_a.id).exists())

    def test_clean_account_state(self):
        from django.db.models import Q
        from chat.models import ChatRoom
        new_user = User.objects.create_user(username='brand_new_user', password='Password123!')
        self.client.force_authenticate(user=new_user)

        # Cart is clean (0 items)
        cart_res = self.client.get('/api/marketplace/cart/')
        self.assertEqual(cart_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cart_res.data), 0)

        # Orders is clean (0 orders)
        orders_res = self.client.get('/api/marketplace/orders/')
        self.assertEqual(orders_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(orders_res.data), 0)

        # Chat rooms is clean (0 rooms)
        rooms_count = ChatRoom.objects.filter(Q(buyer=new_user) | Q(seller=new_user)).count()
        self.assertEqual(rooms_count, 0)

