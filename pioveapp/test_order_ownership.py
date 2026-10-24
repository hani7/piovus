from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Customer, Order, UserProfile


class OrderOwnershipTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('new-account', email='account@example.com')
        self.profile = UserProfile.objects.create(user=self.user, phone='0555000001')
        self.other = User.objects.create_user('other-account')
        customer = Customer.objects.create(phone=self.profile.phone)
        self.unowned_orders = []
        for owner in (None, self.other):
            for contact in (
                {'guest_phone': self.profile.phone},
                {'guest_email': self.user.email.upper()},
                {'customer': customer},
            ):
                self.unowned_orders.append(Order.objects.create(user=owner, **contact))
        self.client.force_authenticate(self.user)

    def assert_order_ids(self, expected):
        response = self.client.get('/api/orders/', {'page_size': 3})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], len(expected))
        self.assertEqual([order['id'] for order in response.data['results']], expected)

    def test_new_retail_and_b2b_accounts_do_not_inherit_matching_orders(self):
        for is_b2b in (False, True):
            with self.subTest(is_b2b=is_b2b):
                self.profile.is_b2b = is_b2b
                self.profile.save(update_fields=['is_b2b'])
                self.assert_order_ids([])

    def test_only_owned_active_orders_appear_newest_first(self):
        older = Order.objects.create(user=self.user)
        newer = Order.objects.create(user=self.user)
        Order.objects.create(user=self.user, is_deleted=True)
        self.assert_order_ids([newer.pk, older.pk])

    def test_matching_contact_details_do_not_grant_order_detail_access(self):
        for order in self.unowned_orders:
            with self.subTest(order=order.pk):
                response = self.client.get(f'/api/orders/{order.pk}/')
                self.assertEqual(response.status_code, 404)

    def test_owned_order_remains_accessible_after_contact_change(self):
        order = Order.objects.create(user=self.user)
        self.user.email = 'changed@example.com'
        self.user.save(update_fields=['email'])
        self.profile.phone = '0555000002'
        self.profile.save(update_fields=['phone'])
        self.assert_order_ids([order.pk])
        response = self.client.get(f'/api/orders/{order.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], order.pk)

    def test_deleted_owned_order_is_not_accessible(self):
        order = Order.objects.create(user=self.user, is_deleted=True)
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/').status_code, 404)

    def test_anonymous_visitors_cannot_list_or_retrieve_orders(self):
        order = Order.objects.create(user=self.user)
        self.client.force_authenticate(None)
        self.assert_order_ids([])
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/').status_code, 404)

    def test_admin_order_management_remains_separate(self):
        admin = User.objects.create_user('staff', is_staff=True)
        self.client.force_authenticate(admin)
        self.assert_order_ids([])
        order = self.unowned_orders[0]
        response = self.client.get(f'/api/admin/orders/{order.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], order.pk)
