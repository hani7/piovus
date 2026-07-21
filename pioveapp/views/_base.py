from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from decimal import Decimal
import csv
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import threading
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from ..models import (
    Category, Product, ProductImage, ProductVariant, Banner, Order, OrderItem, Review, UserProfile,
    DeliveryCompany, DeliveryRate, Customer, OrderStatusHistory, Coupon
)
from ..serializers import (
    CategorySerializer,
    ProductListSerializer, ProductDetailSerializer,
    BannerSerializer,
    UserSerializer, RegisterSerializer,
    OrderSerializer, OrderCreateSerializer,
    ReviewSerializer,
    AdminProductSerializer, AdminProductVariantSerializer, AdminProductImageSerializer, AdminCategorySerializer,
    AdminBannerSerializer, AdminOrderSerializer, AdminOrderStatusSerializer,
    DeliveryCompanySerializer, DeliveryRateSerializer, CustomerSerializer, CouponSerializer
)

