"""
Django settings for pioveecom project — Piové Cosmetics E-Commerce
"""

from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

import os

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-gz!&qj#^zt(hd%k-m6ruxtu3go83xrqhf+667th0^1w5k6bd++')

DEBUG = os.environ.get('DJANGO_DEBUG', '') != 'False'

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Local
    'pioveapp',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

X_FRAME_OPTIONS = 'DENY'

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = False  # cPanel handles SSL at proxy level
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

ROOT_URLCONF = 'pioveecom.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pioveecom.wsgi.application'

# ─── DATABASE ────────────────────────────────────────────────────────────────
# Production: set DATABASE_URL env var to mysql://user:pass@localhost/dbname
# Local dev: uses SQLite automatically
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-dz'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── CORS & CSRF ────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://piovecosmetics.dz',
    'https://www.piovecosmetics.dz',
    'https://app.piovecosmetics.dz',
    'https://api.piovecosmetics.dz',
]
# Allow extra origins from env var (comma-separated)
_extra = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _extra:
    CORS_ALLOWED_ORIGINS += [o.strip() for o in _extra.split(',') if o.strip()]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://piovecosmetics.dz',
    'https://www.piovecosmetics.dz',
    'https://app.piovecosmetics.dz',
    'https://api.piovecosmetics.dz',
]

# ─── REST FRAMEWORK ──────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'pioveecom.pagination.FlexiblePagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/minute',
        'user': '1000/minute'
    }
}

# ─── JWT ─────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
}

# ─── EMAIL CONFIGURATION ─────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL = 'Piové Cosmetics <contact@piovecosmetics.dz>'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── MYLERZ DELIVERY API ──────────────────────────────────────────────────────
MYLERZ_BASE_URL = os.environ.get('MYLERZ_BASE_URL', 'https://integration.algeria.mylerz.net')
MYLERZ_USERNAME = os.environ.get('MYLERZ_USERNAME', 'piovestore')
MYLERZ_PASSWORD = os.environ.get('MYLERZ_PASSWORD', 'PioveShipping2025*')
MYLERZ_WAREHOUSE_NAME = os.environ.get('MYLERZ_WAREHOUSE_NAME', 'piovestore')

# ─── SATIM (CIB/EDAHABIA) PAYMENT API ────────────────────────────────────────
SATIM_USER_NAME = os.environ.get('SATIM_USER_NAME', 'SAT2606161972')
SATIM_PASSWORD = os.environ.get('SATIM_PASSWORD', 'satim120')
SATIM_TERMINAL_ID = os.environ.get('SATIM_TERMINAL_ID', 'E010903300')
SATIM_BASE_URL = os.environ.get('SATIM_BASE_URL', 'https://test2.satim.dz/payment/rest')

# ─── UPLOAD SIZE LIMITS (video support) ──────────────────────────────────────
DATA_UPLOAD_MAX_MEMORY_SIZE = 209715200   # 200MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 209715200   # 200MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10240
