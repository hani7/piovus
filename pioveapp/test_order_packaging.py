from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Order, OrderItem, Product, UserProfile


class OrderPackagingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('professional')
        self.profile = UserProfile.objects.create(user=self.user, is_b2b=True)
        self.admin = User.objects.create_user('administrator', is_staff=True)
        self.product = Product.objects.create(
            name='Test product', price=1000, stock=100,
            b2b_price_box=2000, b2b_price_carton=20000,
        )
        self.client.force_authenticate(self.user)
        email_templates = patch('pioveapp.views.render_to_string', return_value='Test notification')
        email_templates.start()
        self.addCleanup(email_templates.stop)

    def checkout(self, items):
        return self.client.post('/api/orders/', {
            'guest_name': 'Test company', 'guest_phone': '0555000001',
            'wilaya': 'Alger', 'commune': 'Hydra', 'address': 'Test address',
            'delivery_type': 'home', 'payment_method': 'cash', 'items': items,
        }, format='json')

    def test_mixed_packaging_is_saved_and_returned_in_admin_details(self):
        response = self.checkout([
            {'product_id': self.product.pk, 'quantity': 2, 'packaging': 'boite'},
            {'product_id': self.product.pk, 'quantity': 1, 'packaging': 'carton'},
        ])
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(pk=response.data['id'])
        self.assertEqual(order.total, Decimal('24000'))
        items = list(order.items.order_by('id'))
        self.assertEqual([item.packaging for item in items], ['boite', 'carton'])
        self.assertEqual([item.price_at_purchase for item in items], [Decimal('2000'), Decimal('20000')])

        self.product.b2b_price_box = 5000
        self.product.b2b_price_carton = 5000
        self.product.save()
        self.client.force_authenticate(self.admin)
        detail = self.client.get(f'/api/admin/orders/{order.pk}/')
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data['is_b2b'])
        self.assertEqual({item['id']: item['packaging'] for item in detail.data['items']},
                         {items[0].pk: 'boite', items[1].pk: 'carton'})

        edited = self.client.post(f'/api/admin/orders/{order.pk}/edit_order/', {
            'items': [{'id': items[1].pk, 'quantity': 2}],
        }, format='json')
        self.assertEqual(edited.status_code, 200, edited.data)
        items[1].refresh_from_db()
        self.assertEqual(items[1].packaging, 'carton')

    def test_b2b_default_is_box(self):
        response = self.checkout([{'product_id': self.product.pk, 'quantity': 10}])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['items'][0]['packaging'], 'boite')

    def test_invalid_packaging_is_rejected_without_creating_order(self):
        response = self.checkout([{'product_id': self.product.pk, 'quantity': 10, 'packaging': 'invalid'}])
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_retail_checkout_does_not_record_b2b_packaging(self):
        self.profile.is_b2b = False
        self.profile.save()
        response = self.checkout([{'product_id': self.product.pk, 'quantity': 1, 'packaging': 'carton'}])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['items'][0]['packaging'], '')
        self.assertEqual(Decimal(response.data['total']), Decimal('1000'))

    def test_missing_historical_packaging_is_not_guessed_from_price(self):
        order = Order.objects.create(user=self.user)
        item = OrderItem.objects.create(order=order, product=self.product,
                                        product_name=self.product.name, price_at_purchase=20000)
        self.client.force_authenticate(self.admin)
        response = self.client.get(f'/api/admin/orders/{order.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['items'][0]['packaging'], '')
        item.refresh_from_db()
        self.assertEqual(item.packaging, '')
