from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Customer, UserProfile


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://shop.example.com',
    STORAGES={
        'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    },
)
class B2BApprovalTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('professional', email='pro@example.com', password='testpass123')
        UserProfile.objects.create(user=self.user, is_b2b_pending=True, phone='0555000000')
        self.admin = User.objects.create_user('reviewer', is_staff=True)
        self.customer = Customer.objects.create(email=self.user.email, phone='0555000000')

    def login(self):
        return self.client.post('/api/auth/login/', {
            'username': self.user.username, 'password': 'testpass123',
        })

    def approve(self):
        self.client.force_authenticate(self.admin)
        return self.client.post(f'/api/admin/b2b-requests/{self.user.pk}/validate/')

    def test_registration_returns_pending_without_tokens(self):
        response = self.client.post('/api/auth/register-b2b/', {
            'username': 'newprofessional', 'email': 'new@example.com',
            'password': 'testpass123', 'password2': 'testpass123',
            'company_name': 'Test company', 'phone': '0555000001',
            'nrc': 'RC123',
            'nrc_file': SimpleUploadedFile('rc.pdf', b'%PDF-1.4 test', 'application/pdf'),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['code'], 'b2b_pending')
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        profile = User.objects.get(username='newprofessional').profile
        self.assertTrue(profile.is_b2b_pending)
        self.assertFalse(profile.is_b2b)
        self.assertEqual(profile.nif, '')
        self.assertEqual(profile.user.first_name, '')
        self.assertEqual(profile.user.last_name, '')

    def test_email_required_for_b2b_registration(self):
        response = self.client.post('/api/auth/register-b2b/', {})
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    def test_pending_password_login_is_blocked(self):
        response = self.login()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'b2b_pending')

    def test_existing_access_and_refresh_tokens_are_blocked(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'b2b_pending')
        self.client.credentials()
        response = self.client.post('/api/auth/token/refresh/', {'refresh': str(refresh)})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'b2b_pending')

    @patch('pioveapp.views.id_token.verify_oauth2_token')
    def test_pending_google_login_is_blocked(self, verify):
        verify.return_value = {'email': self.user.email}
        response = self.client.post('/api/auth/google/', {'token': 'test'})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'b2b_pending')

    def test_pending_otp_login_is_blocked(self):
        cache.set(f'mfa_otp_{self.user.pk}', '123456')
        response = self.client.post('/api/auth/verify-otp/', {'user_id': self.user.pk, 'otp': '123456'})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'b2b_pending')

    def test_approval_sends_email_and_allows_login(self):
        response = self.approve()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn('https://shop.example.com/compte', mail.outbox[0].body)
        self.user.profile.refresh_from_db()
        self.customer.refresh_from_db()
        self.assertFalse(self.user.profile.is_b2b_pending)
        self.assertTrue(self.user.profile.is_b2b)
        self.assertTrue(self.customer.is_b2b)
        self.approve()
        self.assertEqual(len(mail.outbox), 1)
        self.client.force_authenticate(None)
        response = self.login()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('access', response.data)

    @patch('pioveapp.b2b_email.send_mail', side_effect=OSError('SMTP unavailable'))
    def test_email_failure_keeps_account_pending_for_retry(self, send):
        response = self.approve()
        self.assertEqual(response.status_code, 503)
        self.user.profile.refresh_from_db()
        self.customer.refresh_from_db()
        self.assertTrue(self.user.profile.is_b2b_pending)
        self.assertFalse(self.user.profile.is_b2b)
        self.assertFalse(self.customer.is_b2b)
        self.assertFalse(self.admin.activity_logs.filter(action__startswith='Validation').exists())

    @patch('pioveapp.b2b_email.send_mail', return_value=0)
    def test_unaccepted_email_is_not_reported_as_success(self, send):
        response = self.approve()
        self.assertEqual(response.status_code, 503)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.is_b2b_pending)

    @patch('pioveapp.views.id_token.verify_oauth2_token')
    def test_rejected_account_cannot_login(self, verify):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f'/api/admin/b2b-requests/{self.user.pk}/reject/')
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(None)
        self.assertEqual(self.login().status_code, 401)
        verify.return_value = {'email': self.user.email}
        self.assertEqual(self.client.post('/api/auth/google/', {'token': 'test'}).status_code, 403)

    def test_customer_cannot_approve_own_account(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/admin/b2b-requests/{self.user.pk}/validate/')
        self.assertEqual(response.status_code, 403)

    def test_profile_cannot_grant_b2b_access(self):
        self.user.profile.is_b2b_pending = False
        self.user.profile.save()
        self.client.force_authenticate(self.user)
        response = self.client.patch('/api/auth/profile/', {'profile': {'is_b2b': True}}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.is_b2b)
