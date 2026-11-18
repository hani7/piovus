import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class B2BEmailDeliveryError(APIException):
    status_code = 503
    default_detail = (
        "L'email de validation n'a pas pu être envoyé. Le compte reste en attente. "
        "Vérifiez la configuration email puis réessayez la validation."
    )


def send_mail(subject, message, from_email, recipient_list, html_message=None, **kwargs):
    """Send the approval email with a plain-text fallback and an HTML version."""
    fail_silently = kwargs.pop('fail_silently', False)
    email = EmailMultiAlternatives(subject, message, from_email, recipient_list, **kwargs)
    if html_message:
        email.attach_alternative(html_message, 'text/html')
    return email.send(fail_silently=fail_silently)


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
        html_body = render_to_string('emails/b2b_approval.html', {
            'user': user,
            'login_url': login_url,
        })
        sent = send_mail(
            'Votre compte B2B est validé — Piové Cosmetics',
            body, settings.DEFAULT_FROM_EMAIL, [user.email],
            html_message=html_body,
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError('Email backend did not accept the message')
    except Exception as exc:
        logger.error('B2B approval email failed for user %s (%s)', user.pk, type(exc).__name__)
        raise B2BEmailDeliveryError() from exc
