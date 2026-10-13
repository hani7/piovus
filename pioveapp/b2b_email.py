import logging

from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class B2BEmailDeliveryError(APIException):
    status_code = 503
    default_detail = (
        "L'email de validation n'a pas pu être envoyé. Le compte reste en attente. "
        "Vérifiez la configuration email puis réessayez la validation."
    )


def send_b2b_approval_email(user):
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/compte"
    body = (
        f"Bonjour {user.first_name or user.username},\n\n"
        "Votre compte professionnel B2B Piové Cosmetics a été vérifié et validé "
        "par notre équipe.\n\n"
        "Vous pouvez maintenant vous connecter avec vos identifiants et accéder "
        "à votre espace professionnel.\n\n"
        f"Se connecter : {login_url}\n\n"
        "Merci pour votre confiance.\nL'équipe Piové Cosmetics"
    )
    try:
        if not user.email:
            raise ValueError('Missing B2B account email')
        sent = send_mail(
            'Votre compte B2B est validé — Piové Cosmetics',
            body, settings.DEFAULT_FROM_EMAIL, [user.email],
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError('Email backend did not accept the message')
    except Exception as exc:
        logger.error('B2B approval email failed for user %s (%s)', user.pk, type(exc).__name__)
        raise B2BEmailDeliveryError() from exc
