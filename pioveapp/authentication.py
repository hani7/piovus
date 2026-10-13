from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings


def ensure_b2b_approved(user):
    if not user.is_active:
        raise PermissionDenied({'code': 'account_inactive', 'error': 'Ce compte est désactivé.'})
    profile = getattr(user, 'profile', None)
    if profile and profile.is_b2b_pending:
        raise PermissionDenied({
            'code': 'b2b_pending',
            'error': 'Votre compte B2B est en attente de vérification. '
                     'Vous recevrez un email après validation par notre équipe.',
        })


class ApprovedAccountJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        ensure_b2b_approved(user)
        return user


class ApprovedAccountTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = self.token_class(attrs['refresh'])
        user = get_user_model().objects.filter(**{
            api_settings.USER_ID_FIELD: token[api_settings.USER_ID_CLAIM],
        }).first()
        if user:
            ensure_b2b_approved(user)
        return super().validate(attrs)
