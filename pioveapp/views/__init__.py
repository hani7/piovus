"""
views/__init__.py — Re-exports all view classes so urls.py needs no changes.
"""

from .shop import CategoryViewSet, ProductViewSet, BannerViewSet

from .auth import (
    RegisterView, B2BRegisterView,
    LoginView, VerifyOTPView, LogoutView,
    GoogleLoginView, FacebookLoginView,
    ProfileView, PasswordChangeView,
    handle_social_login,
)

from .orders import ApplyCouponView, OrderViewSet

from .admin_products import (
    ActivityLogMixin,
    AdminDashboardView,
    AdminProductViewSet, AdminProductVariantViewSet, AdminProductImageViewSet,
    AdminCategoryViewSet, AdminBannerViewSet,
)

from .admin_orders import AdminOrderViewSet, handle_loyalty_points

from .admin_customers import (
    AdminCouponViewSet, AdminActivityLogView,
    DeliveryCompanyViewSet, DeliveryRateViewSet,
    CustomerViewSet,
    AdminNewsletterSendView, AdminNewsletterUploadImageView,
)

from .admin_reports import AdminReportView

from .admin_settings import (
    SiteSettingsView, AdminSiteSettingsView,
    AdminB2BRequestViewSet,
    AdminMediaView,
    AdminProfileView, AdminChangePasswordView,
    AdminOrderHistoryViewSet,
    mylerz_webhook,
    satim_callback, satim_test_view,
)

__all__ = [
    'CategoryViewSet', 'ProductViewSet', 'BannerViewSet',
    'RegisterView', 'B2BRegisterView', 'LoginView', 'VerifyOTPView',
    'LogoutView', 'GoogleLoginView', 'FacebookLoginView',
    'ProfileView', 'PasswordChangeView', 'handle_social_login',
    'ApplyCouponView', 'OrderViewSet',
    'ActivityLogMixin', 'AdminDashboardView',
    'AdminProductViewSet', 'AdminProductVariantViewSet', 'AdminProductImageViewSet',
    'AdminCategoryViewSet', 'AdminBannerViewSet',
    'AdminOrderViewSet', 'handle_loyalty_points',
    'AdminCouponViewSet', 'AdminActivityLogView',
    'DeliveryCompanyViewSet', 'DeliveryRateViewSet', 'CustomerViewSet',
    'AdminNewsletterSendView', 'AdminNewsletterUploadImageView',
    'AdminReportView',
    'SiteSettingsView', 'AdminSiteSettingsView',
    'AdminB2BRequestViewSet', 'AdminMediaView',
    'AdminProfileView', 'AdminChangePasswordView', 'AdminOrderHistoryViewSet',
    'mylerz_webhook', 'satim_callback', 'satim_test_view',
    'run_migrations_view', 'run_reports_weekly_view', 'run_reports_monthly_view',
]
