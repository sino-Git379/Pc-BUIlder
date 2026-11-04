from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Listing, CartItem, Order, OrderItem
from .serializers import ListingSerializer, CartItemSerializer, OrderSerializer
from accounts.roles import can_manage_listings, role_for_user


class ListingRolePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and can_manage_listings(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return role_for_user(request.user) == 'Admin' or obj.seller_id == request.user.pk


class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.select_related('seller', 'component__category').all()
    serializer_class = ListingSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [ListingRolePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['component', 'condition', 'is_active']
    search_fields = ['component__name', 'component__brand', 'description']
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        if not can_manage_listings(request.user):
            return Response({'detail': 'Only managers and administrators can manage listings.'}, status=status.HTTP_403_FORBIDDEN)
        queryset = self.filter_queryset(self.get_queryset().filter(seller=request.user))
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


def create_order_from_cart(user, data):
    cart_items = list(
        CartItem.objects.filter(user=user)
        .select_related('listing__component__category', 'listing__seller')
    )
    direct_items = data.get('items', []) if isinstance(data, dict) else []

    if not cart_items and not direct_items:
        return None

    raw_card = str(data.get('card_number', '') or '').replace(' ', '').replace('-', '')
    digits_only = ''.join(ch for ch in raw_card if ch.isdigit())
    card_last4 = digits_only[-4:] if len(digits_only) >= 4 else (raw_card[-4:] if len(raw_card) >= 4 else '4242')
    card_holder = str(data.get('card_holder', '') or '').strip() or user.username
    offer_override = data.get('offer_total')

    with transaction.atomic():
        if direct_items:
            resolved_rows = []
            for entry in direct_items:
                listing_id = entry.get('listing_id') or entry.get('id')
                qty = max(1, int(entry.get('quantity', 1) or 1))
                listing_obj = Listing.objects.filter(pk=listing_id).select_related(
                    'component__category', 'seller'
                ).first() if listing_id else None

                if listing_obj:
                    comp = listing_obj.component
                    unit_price = Decimal(str(entry.get('price') or listing_obj.price))
                    resolved_rows.append({
                        'listing': listing_obj,
                        'component_name': f"{comp.brand} {comp.name}".strip(),
                        'category_name': comp.category.name if comp.category else '',
                        'seller_username': listing_obj.seller.username if listing_obj.seller else 'RigForge Verified',
                        'price': unit_price,
                        'quantity': qty,
                    })
                else:
                    unit_price = Decimal(str(entry.get('price') or '0.00'))
                    resolved_rows.append({
                        'listing': None,
                        'component_name': str(entry.get('component_name') or entry.get('name') or 'PC Hardware Component')[:255],
                        'category_name': str(entry.get('category_name') or 'Hardware')[:120],
                        'seller_username': str(entry.get('seller_username') or 'RigForge Verified')[:150],
                        'price': unit_price,
                        'quantity': qty,
                    })

            calc_total = sum((r['price'] * r['quantity'] for r in resolved_rows), Decimal('0.00'))
            final_total = Decimal(str(offer_override)) if offer_override else calc_total

            order = Order.objects.create(
                user=user,
                total_price=final_total,
                card_holder=card_holder[:120],
                card_last4=card_last4[:4],
                status='paid'
            )
            for r in resolved_rows:
                OrderItem.objects.create(
                    order=order,
                    listing=r['listing'],
                    component_name=r['component_name'],
                    category_name=r['category_name'],
                    seller_username=r['seller_username'],
                    price=r['price'],
                    quantity=r['quantity']
                )
            CartItem.objects.filter(user=user).delete()
            return order

        total = sum((Decimal(str(item.listing.price)) * item.quantity for item in cart_items), Decimal('0.00'))
        if offer_override:
            total = Decimal(str(offer_override))
        order = Order.objects.create(
            user=user,
            total_price=total,
            card_holder=card_holder[:120],
            card_last4=card_last4[:4],
            status='paid'
        )
        for item in cart_items:
            comp = item.listing.component
            comp_title = f"{comp.brand} {comp.name}".strip()
            OrderItem.objects.create(
                order=order,
                listing=item.listing,
                component_name=comp_title,
                category_name=comp.category.name if comp.category else '',
                seller_username=item.listing.seller.username if item.listing.seller else '',
                price=item.listing.price,
                quantity=item.quantity
            )
        CartItem.objects.filter(user=user).delete()

    return order


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related(
            'listing__component__category', 'listing__seller'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        listing = serializer.validated_data['listing']
        item, created = CartItem.objects.get_or_create(
            user=self.request.user,
            listing=listing,
            defaults={'quantity': serializer.validated_data.get('quantity', 1)},
        )
        if not created:
            item.quantity += serializer.validated_data.get('quantity', 1)
            item.save(update_fields=['quantity'])
        serializer.instance = item

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        order = create_order_from_cart(request.user, request.data)
        if not order:
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        order = create_order_from_cart(request.user, request.data)
        if not order:
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
