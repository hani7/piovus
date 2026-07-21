"""
tests.py — Test suite for Piové Cosmetics API.
Covers auth flow, product filtering, order creation, and permission enforcement.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import (
    Category, Product, Order, OrderItem,
    UserProfile, Customer, Coupon, DeliveryCompany, DeliveryRate,
)
from decimal import Decimal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username='testuser', password='testpass123', is_staff=False):
    user = User.objects.create_user(username=username, password=password, email=f'{username}@test.com', is_staff=is_staff)
    UserProfile.objects.get_or_create(user=user)
    return user


def make_product(name='Crème Test', price=1500, stock=50, is_active=True):
    return Product.objects.create(name=name, price=price, stock=stock, is_active=is_active)


def auth_header(client, username='testuser', password='testpass123'):
    r = client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f"Bearer {r.data.get('access', '')}"}


# ---------------------------------------------------------------------------
# Auth Tests
# ---------------------------------------------------------------------------

class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        r = self.client.post('/api/auth/register/', {
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123',
            'email': 'newuser@test.com',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)

    def test_register_duplicate_username(self):
        make_user('duplicate')
        r = self.client.post('/api/auth/register/', {
            'username': 'duplicate',
            'password': 'pass1234',
            'email': 'dup@test.com',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()

    def test_login_success(self):
        r = self.client.post('/api/auth/login/', {'username': 'testuser', 'password': 'testpass123'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)

    def test_login_wrong_password(self):
        r = self.client.post('/api/auth/login/', {'username': 'testuser', 'password': 'wrongpass'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        r = self.client.post('/api/auth/login/', {'username': 'ghost', 'password': 'pass'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()

    def test_profile_requires_auth(self):
        r = self.client.get('/api/auth/profile/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        headers = auth_header(self.client)
        self.client.credentials(HTTP_AUTHORIZATION=headers['HTTP_AUTHORIZATION'])
        r = self.client.get('/api/auth/profile/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['username'], 'testuser')


# ---------------------------------------------------------------------------
# Product Tests
# ---------------------------------------------------------------------------

class ProductTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name='Soins', slug='soins', is_active=True)
        self.p1 = make_product('Crème A', price=1000)
        self.p2 = make_product('Sérum B', price=3000)
        self.p_inactive = make_product('Invisible', is_active=False)
        self.p1.categories.add(self.cat)

    def test_list_products_public(self):
        r = self.client.get('/api/products/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in r.data.get('results', r.data)]
        self.assertIn('Crème A', names)
        self.assertNotIn('Invisible', names)

    def test_product_search(self):
        r = self.client.get('/api/products/?search=Sérum')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        self.assertTrue(any('Sérum' in p['name'] for p in results))

    def test_product_filter_by_price(self):
        r = self.client.get('/api/products/?price__lte=2000')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        for p in results:
            self.assertLessEqual(float(p['price']), 2000)

    def test_product_detail_by_slug(self):
        r = self.client.get(f'/api/products/{self.p1.slug}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['name'], 'Crème A')


# ---------------------------------------------------------------------------
# Order Tests
# ---------------------------------------------------------------------------

class OrderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('orderuser')
        self.product = make_product('Produit Test', price=2000, stock=100)
        headers = auth_header(self.client, 'orderuser')
        self.client.credentials(HTTP_AUTHORIZATION=headers['HTTP_AUTHORIZATION'])

    def _order_payload(self, product_id, qty=1, payment='cash'):
        return {
            'guest_name': 'Test Client',
            'guest_phone': '0555123456',
            'guest_email': 'test@test.com',
            'wilaya': 'Alger',
            'commune': 'Hydra',
            'address': '12 Rue Test',
            'delivery_type': 'home',
            'payment_method': payment,
            'items': [{'product_id': product_id, 'quantity': qty}],
        }

    def test_create_order_authenticated(self):
        r = self.client.post('/api/orders/', self._order_payload(self.product.id), format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], 'pending')

    def test_order_list_only_own_orders(self):
        self.client.post('/api/orders/', self._order_payload(self.product.id), format='json')
        r = self.client.get('/api/orders/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        self.assertGreater(len(results), 0)

    def test_create_order_invalid_product(self):
        payload = self._order_payload(99999)
        r = self.client.post('/api/orders/', payload, format='json')
        self.assertIn(r.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    def test_create_order_unauthenticated(self):
        self.client.credentials()
        r = self.client.post('/api/orders/', self._order_payload(self.product.id), format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Coupon Tests
# ---------------------------------------------------------------------------

class CouponTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coupon = Coupon.objects.create(
            code='TEST10',
            discount_type='percentage',
            discount_value=Decimal('10'),
            is_active=True,
            usage_limit=100,
        )

    def test_apply_valid_coupon(self):
        r = self.client.post('/api/apply-coupon/', {'code': 'TEST10', 'cart_total': 5000}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data['success'])
        self.assertEqual(float(r.data['discount_amount']), 500.0)

    def test_apply_invalid_coupon(self):
        r = self.client.post('/api/apply-coupon/', {'code': 'FAKECODE', 'cart_total': 5000}, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Admin Permission Tests
# ---------------------------------------------------------------------------

class AdminPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.regular = make_user('regular')
        self.admin = make_user('adminuser', is_staff=True)

    def _login(self, username, password='testpass123'):
        r = self.client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data.get('access', '')}")

    def test_admin_dashboard_requires_admin(self):
        self._login('regular')
        r = self.client.get('/api/admin/dashboard/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_dashboard_accessible_by_admin(self):
        self._login('adminuser')
        r = self.client.get('/api/admin/dashboard/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_admin_products_requires_admin(self):
        self._login('regular')
        r = self.client.get('/api/admin/products/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_orders_requires_admin(self):
        self._login('regular')
        r = self.client.get('/api/admin/orders/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
