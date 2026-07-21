from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CategoryViewSet, ProductViewSet, BannerViewSet,
    RegisterView, B2BRegisterView, LoginView, LogoutView, ProfileView, VerifyOTPView, PasswordChangeView,
    GoogleLoginView, FacebookLoginView,
    OrderViewSet,
    AdminDashboardView, AdminActivityLogView,
    AdminProductViewSet, AdminProductVariantViewSet, AdminProductImageViewSet, AdminCategoryViewSet,
    AdminBannerViewSet, AdminOrderViewSet, AdminCouponViewSet, AdminOrderHistoryViewSet,
    DeliveryCompanyViewSet, DeliveryRateViewSet, CustomerViewSet,
    AdminNewsletterSendView, AdminNewsletterUploadImageView, AdminReportView, ApplyCouponView,
    SiteSettingsView, AdminSiteSettingsView, AdminB2BRequestViewSet,
    mylerz_webhook, satim_callback, satim_test_view, AdminMediaView,
    AdminProfileView, AdminChangePasswordView, TrackOrderView
)
from django.core.management import call_command
from django.http import JsonResponse

def run_migrations_view(request):
    try:
        call_command('migrate')
        return JsonResponse({'status': 'success', 'message': 'Migrations executed successfully!'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

def run_reports_weekly_view(request):
    try:
        call_command('send_reports', period='weekly')
        return JsonResponse({'status': 'success', 'message': 'Weekly reports sent!'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

def run_reports_monthly_view(request):
    try:
        call_command('send_reports', period='monthly')
        return JsonResponse({'status': 'success', 'message': 'Monthly reports sent!'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'banners', BannerViewSet, basename='banner')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'delivery-companies', DeliveryCompanyViewSet, basename='delivery-company')
router.register(r'delivery-rates', DeliveryRateViewSet, basename='delivery-rate')

admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'variants', AdminProductVariantViewSet, basename='admin-variant')
admin_router.register(r'images', AdminProductImageViewSet, basename='admin-image')
admin_router.register(r'banners', AdminBannerViewSet, basename='admin-banner')
admin_router.register(r'orders-history', AdminOrderHistoryViewSet, basename='admin-order-history')
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-order')
admin_router.register(r'customers', CustomerViewSet, basename='admin-customer')
admin_router.register(r'coupons', AdminCouponViewSet, basename='admin-coupon')
admin_router.register(r'b2b-requests', AdminB2BRequestViewSet, basename='admin-b2b-requests')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('apply-coupon/', ApplyCouponView.as_view(), name='apply-coupon'),
    path('mylerz/webhook/', mylerz_webhook, name='mylerz-webhook'),
    path('track/', TrackOrderView.as_view(), name='track-order'),
    path('satim/callback/', satim_callback, name='satim-callback'),
    path('satim/test/', satim_test_view, name='satim-test'),
    path('run-migrations-secret/', run_migrations_view),
    path('run-reports-secret-weekly/', run_reports_weekly_view),
    path('run-reports-secret-monthly/', run_reports_monthly_view),
    # Auth
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/register-b2b/', B2BRegisterView.as_view(), name='auth-register-b2b'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth-verify-otp'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/password/change/', PasswordChangeView.as_view(), name='auth-password-change'),
    path('auth/google/', GoogleLoginView.as_view(), name='auth-google'),
    path('auth/facebook/', FacebookLoginView.as_view(), name='auth-facebook'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    # Admin
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/reports/', AdminReportView.as_view(), name='admin-reports'),
    path('admin/media/', AdminMediaView.as_view(), name='admin-media'),
    path('admin/newsletter/send/', AdminNewsletterSendView.as_view(), name='admin-newsletter-send'),
    path('admin/newsletter/upload-image/', AdminNewsletterUploadImageView.as_view(), name='admin-newsletter-upload-image'),
    path('admin/activity-logs/', AdminActivityLogView.as_view(), name='admin-activity-logs'),
    path('admin/settings/', AdminSiteSettingsView.as_view(), name='admin-settings'),
    path('admin/settings/toggle_maintenance/', AdminSiteSettingsView.as_view(), name='admin-settings-toggle'),
    path('admin/profile/', AdminProfileView.as_view(), name='admin-profile'),
    path('admin/profile/change-password/', AdminChangePasswordView.as_view(), name='admin-change-password'),
    path('admin/', include(admin_router.urls)),
]
