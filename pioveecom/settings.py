"""
Django settings for pioveecom project — Piové Cosmetics E-Commerce
"""

from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

import os
try:
    from dotenv import load_dotenv
    # Load environment variables from .env file (if it exists)
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('DJANGO_SECRET_KEY') or 'django-insecure-fallback-key-123456'
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost').split(',')

# Frontend URL (used in SATIM callback redirect)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://piovecosmetics.dz')
API_URL = os.environ.get('API_URL', 'https://api.piovecosmetics.dz')

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
    
    # Secure Cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # HSTS & XSS
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 Year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ─── AXES (Anti-Brute Force) ─────────────────────────────────────────────────
# Axes removed to prevent 500 error if not installed on cPanel
# AUTHENTICATION_BACKENDS = [
#     'django.contrib.auth.backends.ModelBackend',
# ]

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
try:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=600,
        )
    }
except ImportError:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
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
# We restrict to allowed domains for max security. 
# (If API requests are blocked in prod, uncomment CORS_ALLOW_ALL_ORIGINS = True)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://piovecosmetics.dz',
    'https://www.piovecosmetics.dz',
    'https://app.piovecosmetics.dz',
]
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
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/minute',
        'user': '1000/minute',
        'auth': '10/minute',
    }
}

# ─── JWT ─────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
}

# ─── EMAIL CONFIGURATION ─────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL = 'Piové Cosmetics <contact@piovecosmetics.dz>'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── MYLERZ DELIVERY API ──────────────────────────────────────────────────────
MYLERZ_BASE_URL = os.environ.get('MYLERZ_BASE_URL', 'https://integration.algeria.mylerz.net')
MYLERZ_USERNAME = os.environ.get('MYLERZ_USERNAME')
MYLERZ_PASSWORD = os.environ.get('MYLERZ_PASSWORD')
MYLERZ_WAREHOUSE_NAME = os.environ.get('MYLERZ_WAREHOUSE_NAME')

# ─── SATIM (CIB/EDAHABIA) PAYMENT API ────────────────────────────────────────
SATIM_USER_NAME  = os.environ.get('SATIM_USER_NAME', '')
SATIM_PASSWORD   = os.environ.get('SATIM_PASSWORD', '')
SATIM_TERMINAL_ID = os.environ.get('SATIM_TERMINAL_ID', '')
SATIM_BASE_URL   = os.environ.get('SATIM_BASE_URL', 'https://cib.satim.dz/payment/rest')
SATIM_SOURCE_IP  = os.environ.get('SATIM_SOURCE_IP', '')


# ─── UPLOAD SIZE LIMITS (video support) ──────────────────────────────────────
DATA_UPLOAD_MAX_MEMORY_SIZE = 209715200   # 200MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 209715200   # 200MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10240
