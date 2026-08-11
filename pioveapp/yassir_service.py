"""
Yassir Cash Payment Service — Piové Cosmetics
==============================================
Gère l'intégration avec l'API Yassir Payment (Wallet / Cash).

Endpoints utilisés :
  POST /api/v1/customers                    — Enregistrement client (idempotent)
  POST /api/v1/payments/intents             — Créer un Payment Intent
  POST /api/v1/payments/intents/{id}/proceed — Procéder au paiement (WALLET_V2)
  GET  /api/v1/payments/intents/{id}/check  — Vérifier le statut du paiement
"""

import base64
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Constantes ──────────────────────────────────────────────────────────────

YASSIR_ENV          = getattr(settings, 'YASSIR_ENV', 'staging')
YASSIR_BASE_URL     = (
    'https://stg-api.payment.yassir.io'
    if YASSIR_ENV == 'staging'
    else 'https://api.payment.yassir.io'
)
YASSIR_CLIENT_ID     = getattr(settings, 'YASSIR_CLIENT_ID', '')
YASSIR_CLIENT_SECRET = getattr(settings, 'YASSIR_CLIENT_SECRET', '')
YASSIR_SERVICE_CODE  = getattr(settings, 'YASSIR_SERVICE_CODE', 'PIOVE')

COUNTRY_CODE = 'DZA'

# Payment status codes from Yassir
STATUS_INITIALIZED       = 0
STATUS_SUCCEEDED         = 2
STATUS_REJECTED          = 3
STATUS_PRE_AUTHORIZED    = 13
STATUS_REQUIRES_OTP      = 12


def _auth_header():
    """Génère l'entête Authorization (client_auth) via Basic Auth Base64."""
    token = base64.b64encode(
        f'{YASSIR_CLIENT_ID}:{YASSIR_CLIENT_SECRET}'.encode()
    ).decode()
    return f'Bearer {token}'


def _common_headers():
    """Headers communs requis par l'API Yassir."""
    return {
        'Authorization': _auth_header(),
        'Content-Type':  'application/json',
        'x-platform':    'API',
        'x-service':     YASSIR_SERVICE_CODE,
        'x-country-code': COUNTRY_CODE,
        'x-locale':      'fr_FR',
    }


# ─── Clients ──────────────────────────────────────────────────────────────────

def register_customer(phone: str) -> dict:
    """
    Enregistre un client Yassir par son numéro de téléphone.
    Retourne le customer Yassir ou lève une exception.
    L'opération est idempotente : si le client existe déjà (409), on continue.

    Args:
        phone: Numéro au format algérien +213... ou 0... (normalisé automatiquement)

    Returns:
        dict contenant les données du customer Yassir
    """
    normalized_phone = _normalize_phone(phone)
    url = f'{YASSIR_BASE_URL}/api/v1/customers'
    payload = {'phone': normalized_phone}

    try:
        resp = requests.post(url, json=payload, headers=_common_headers(), timeout=15)

        if resp.status_code == 409:
            # Client déjà existant — on récupère ses données depuis la réponse
            logger.info(f'[Yassir] Customer already exists for {normalized_phone}')
            data = resp.json().get('data', {})
            # Si la réponse 409 ne contient pas les données, on fait un GET
            if not data.get('id'):
                return {'phone': normalized_phone}
            return data

        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] Customer registered: {data.get("id")} for {normalized_phone}')
        return data

    except requests.exceptions.RequestException as e:
        logger.error(f'[Yassir] register_customer error: {e}')
        raise YassirError(f'Impossible de contacter Yassir: {str(e)}')


def create_payment_intent(order_id: int, amount: float, phone: str) -> dict:
    """
    Crée un Payment Intent Yassir pour une commande donnée.

    Args:
        order_id: ID de la commande Piové (utilisé comme actionId)
        amount:   Montant en DA (DZD)
        phone:    Téléphone du client (normalisé)

    Returns:
        dict avec au moins: paymentId, clientSecret
    """
    normalized_phone = _normalize_phone(phone)
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents?countryCode={COUNTRY_CODE}'

    payload = {
        'actionId':           str(order_id),
        'amount':             float(amount),
        'actionCurrencyCode': 'DZD',
        'actionCountryCode':  COUNTRY_CODE,
        'userId':             normalized_phone,
        'captureMethod':      'DIRECT',  # Capture immédiate
    }

    try:
        resp = requests.post(url, json=payload, headers=_common_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] PaymentIntent created: {data.get("id")} for order #{order_id}')
        return data

    except requests.exceptions.RequestException as e:
        logger.error(f'[Yassir] create_payment_intent error: {e} — {getattr(e.response, "text", "")}')
        raise YassirError(f'Erreur création payment intent: {str(e)}')


def proceed_wallet(payment_intent_id: str) -> dict:
    """
    Déclenche le paiement via portefeuille Yassir (WALLET_V2).
    Retourne le statusCode et le payUrl pour l'OTP si nécessaire.

    Args:
        payment_intent_id: UUID du Payment Intent

    Returns:
        dict avec: statusCode, require3DS, metadata.payUrl (si OTP requis)
    """
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents/{payment_intent_id}/proceed'
    payload = {
        'paymentMethodCode': 'WALLET_V2',
    }

    try:
        resp = requests.post(url, json=payload, headers=_common_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] Proceed wallet for {payment_intent_id}: status={data.get("statusCode")}')
        return data

    except requests.exceptions.RequestException as e:
        logger.error(f'[Yassir] proceed_wallet error: {e} — {getattr(e.response, "text", "")}')
        raise YassirError(f'Erreur proceed wallet: {str(e)}')


def check_payment(payment_intent_id: str) -> dict:
    """
    Vérifie le statut d'un Payment Intent.

    Returns:
        dict avec: statusCode (2=succès, 3=rejeté, etc.)
    """
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents/{payment_intent_id}/check'

    try:
        resp = requests.get(url, headers=_common_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] Check payment {payment_intent_id}: status={data.get("statusCode")}')
        return data

    except requests.exceptions.RequestException as e:
        logger.error(f'[Yassir] check_payment error: {e}')
        raise YassirError(f'Erreur vérification paiement: {str(e)}')


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    """
    Normalise un numéro algérien au format international +213XXXXXXXXX.
    Exemples:
      '0550123456'   → '+213550123456'
      '213550123456' → '+213550123456'
      '+213550123456'→ '+213550123456'
    """
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('+'):
        return phone
    if phone.startswith('213'):
        return f'+{phone}'
    if phone.startswith('0'):
        return f'+213{phone[1:]}'
    return f'+213{phone}'


class YassirError(Exception):
    """Exception levée par le service Yassir."""
    pass
