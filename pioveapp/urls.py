from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CategoryViewSet, ProductViewSet, BannerViewSet,
    RegisterView, LoginView, LogoutView, ProfileView,
    OrderViewSet,
    AdminDashboardView,
    AdminProductViewSet, AdminCategoryViewSet,
    AdminBannerViewSet, AdminOrderViewSet,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'banners', BannerViewSet, basename='banner')
router.register(r'orders', OrderViewSet, basename='order')

admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'banners', AdminBannerViewSet, basename='admin-banner')
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    path('', include(router.urls)),
    # Auth
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    # Admin
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/', include(admin_router.urls)),
]
