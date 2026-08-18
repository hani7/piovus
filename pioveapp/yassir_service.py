"""
Yassir Cash Payment Service — Piové Cosmetics
==============================================
Intégration correcte selon la documentation officielle :
https://stg-docs.payment.yassir.io

Flux complet :
  1. POST /api/v1/customers               — Enregistrement client (idempotent, 409 OK)
  2. POST /api/v1/payments/intents        — Créer un Payment Intent → paymentId + clientSecret
  3. POST /api/v1/payments/intents/{id}/proceed  — Procéder (WALLET_V2) + x-client-secret
     → Retourne payUrl (OTP requis, statusCode=12) ou succès direct (statusCode=2)
  4. Rediriger le client vers payUrl?returnUrl=...
  5. GET  /api/v1/payments/intents/{id}/check — Vérifier après retour OTP
"""

import base64
import logging
import os
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Credentials ─────────────────────────────────────────────────────────────
# Lus depuis les variables d'environnement cPanel (Applications Web → Env Vars)

YASSIR_CLIENT_ID       = os.environ.get('YASSIR_CLIENT_ID', 'EXT_PIOVE_SHOP.EXT_PIOVE_SHOP.01M07X5FPQWRV1HJTWR06SBH2G')
YASSIR_CLIENT_SECRET   = os.environ.get('YASSIR_CLIENT_SECRET', 'e4f3ad4ff8cdd772d7445d279653d3a265048f1f796b71606a185e80c40f67dad0f122d253d88ac4913e4ea2555732bdb8ab1eea99fb3d823464111161a5bf0b')
YASSIR_SERVICE_CODE    = os.environ.get('YASSIR_SERVICE_CODE', 'EXT_PIOVE_SHOP')
YASSIR_PUBLISHABLE_KEY = os.environ.get('YASSIR_PUBLISHABLE_KEY', 'pk_yassir_909a0bc0b5d71024e9131d766bdbc895')

# ⚠️ URL correcte selon la documentation officielle
YASSIR_BASE_URL = os.environ.get('YASSIR_BASE_URL', 'https://api.payment.yassir.io')

COUNTRY_CODE = 'DZA'

# Status codes Yassir
STATUS_SUCCEEDED      = 2
STATUS_REJECTED       = 3
STATUS_REQUIRES_OTP   = 12   # → rediriger vers payUrl
STATUS_PRE_AUTHORIZED = 13


class YassirError(Exception):
    """Exception levée par le service Yassir."""
    pass


# ─── Authentification ─────────────────────────────────────────────────────────

def _auth_token():
    """
    Génère le Bearer token client_auth (server-to-server).
    Format: Bearer base64(client_id:client_secret)
    """
    raw = f'{YASSIR_CLIENT_ID}:{YASSIR_CLIENT_SECRET}'
    return 'Bearer ' + base64.b64encode(raw.encode()).decode()


def _base_headers():
    """Headers communs pour toutes les requêtes serveur (client_auth)."""
    return {
        'Authorization': _auth_token(),
        'Content-Type':  'application/json',
        'x-platform':    'API',
        'x-service':     YASSIR_SERVICE_CODE,
        'x-country-code': COUNTRY_CODE,
        'x-locale':      'fr_FR',
    }


# ─── 1. Enregistrement client ─────────────────────────────────────────────────

def register_customer(phone: str, name: str = 'Client Piové') -> dict:
    """
    Enregistre un client Yassir par son numéro de téléphone.
    Opération idempotente : si le client existe déjà (409), on continue sans erreur.

    Args:
        phone: Numéro algérien (normalisé en +213...)
        name:  Nom du client (optionnel, défaut 'Client Piové')

    Returns:
        dict avec les données du customer Yassir
    """
    normalized = _normalize_phone(phone)
    url = f'{YASSIR_BASE_URL}/api/v1/customers'
    payload = {
        'phone':    normalized,
        'name':     name,
        'isActive': True,
    }

    try:
        resp = requests.post(url, json=payload, headers=_base_headers(), timeout=20)

        if resp.status_code == 409:
            # Client déjà existant — c'est normal, on continue
            logger.info(f'[Yassir] Customer already exists: {normalized}')
            data = resp.json().get('data', {})
            return data if data else {'phone': normalized}

        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] Customer registered: {data.get("id")} — {normalized}')
        return data

    except requests.exceptions.RequestException as e:
        body = getattr(getattr(e, 'response', None), 'text', '')
        logger.error(f'[Yassir] register_customer error: {e} — {body}')
        raise YassirError(f'Enregistrement client Yassir impossible: {e}')


# ─── 2. Créer un Payment Intent ───────────────────────────────────────────────

def create_payment_intent(order_id: int, amount: float, phone: str) -> dict:
    """
    Crée un Payment Intent Yassir.

    Args:
        order_id: ID commande Piové (utilisé comme actionId)
        amount:   Montant en DA
        phone:    Téléphone client (sera normalisé)

    Returns:
        dict avec paymentId et clientSecret (obligatoires pour la suite)
    """
    normalized = _normalize_phone(phone)
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents?countryCode={COUNTRY_CODE}'

    payload = {
        'actionId':           str(order_id),
        'amount':             float(amount),
        'actionCurrencyCode': 'DZD',
        'actionCountryCode':  COUNTRY_CODE,
        'userId':             normalized,   # téléphone du client enregistré
        'captureMethod':      'DIRECT',     # capture immédiate
    }

    try:
        resp = requests.post(url, json=payload, headers=_base_headers(), timeout=20)
        resp.raise_for_status()

        data = resp.json().get('data', {})
        payment_id    = data.get('paymentId') or data.get('id', '')
        client_secret = data.get('clientSecret', '')

        logger.info(f'[Yassir] PaymentIntent created: paymentId={payment_id} order=#{order_id}')

        if not payment_id:
            logger.error(f'[Yassir] No paymentId in response: {resp.text}')
            raise YassirError('Pas de paymentId dans la réponse Yassir')

        return {
            'paymentId':    payment_id,
            'clientSecret': client_secret,
            'raw':          data,
        }

    except requests.exceptions.RequestException as e:
        body = getattr(getattr(e, 'response', None), 'text', '')
        logger.error(f'[Yassir] create_payment_intent error: {e} — {body}')
        raise YassirError(f'Création payment intent échouée: {e} — {body}')


# ─── 3. Procéder au paiement (WALLET_V2) ─────────────────────────────────────

def proceed_wallet(payment_id: str, client_secret: str) -> dict:
    """
    Déclenche le paiement via le portefeuille Yassir (WALLET_V2).

    ⚠️ IMPORTANT: le header x-client-secret (clientSecret du payment intent)
    est OBLIGATOIRE pour cet appel, même en client_auth (server-side).

    Args:
        payment_id:    UUID du Payment Intent (data.paymentId)
        client_secret: clientSecret retourné par create_payment_intent (pa_..._secret_...)

    Returns:
        dict avec:
          - statusCode: 12 → OTP requis, payUrl dans metadata
          - statusCode: 2  → paiement direct réussi
          - statusCode: 3  → rejeté
    """
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents/{payment_id}/proceed'

    headers = _base_headers()
    headers['x-client-secret'] = client_secret  # ← OBLIGATOIRE selon la doc

    payload = {'paymentMethodCode': 'WALLET_V2'}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=20)
        resp.raise_for_status()

        data = resp.json().get('data', {})
        status_code = data.get('statusCode')
        pay_url = (data.get('metadata') or {}).get('payUrl', '')

        logger.info(f'[Yassir] Proceed {payment_id}: statusCode={status_code} payUrl={bool(pay_url)}')
        return {
            'statusCode':  status_code,
            'require3DS':  data.get('require3DS', False),
            'payUrl':      pay_url,
            'status':      data.get('status', ''),
            'raw':         data,
        }

    except requests.exceptions.RequestException as e:
        body = getattr(getattr(e, 'response', None), 'text', '')
        logger.error(f'[Yassir] proceed_wallet error: {e} — {body}')
        raise YassirError(f'Proceed wallet échoué: {e} — {body}')


# ─── 4. Vérifier le statut ────────────────────────────────────────────────────

def check_payment(payment_id: str) -> dict:
    """
    Vérifie le statut d'un Payment Intent après retour OTP.

    Returns:
        dict avec statusCode: 2=succès, 3=rejeté, 13=pré-autorisé
    """
    url = f'{YASSIR_BASE_URL}/api/v1/payments/intents/{payment_id}/check'

    try:
        resp = requests.get(url, headers=_base_headers(), timeout=20)
        resp.raise_for_status()
        data = resp.json().get('data', {})
        logger.info(f'[Yassir] Check {payment_id}: statusCode={data.get("statusCode")}')
        return data

    except requests.exceptions.RequestException as e:
        body = getattr(getattr(e, 'response', None), 'text', '')
        logger.error(f'[Yassir] check_payment error: {e} — {body}')
        raise YassirError(f'Vérification paiement échouée: {e}')


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    """
    Normalise un numéro algérien au format +213XXXXXXXXX.
    Exemples :
        '0550123456'    → '+213550123456'
        '213550123456'  → '+213550123456'
        '+213550123456' → '+213550123456'
    """
    phone = phone.strip().replace(' ', '').replace('-', '').replace('.', '')
    if phone.startswith('+213'):
        return phone
    if phone.startswith('213'):
        return f'+{phone}'
    if phone.startswith('0'):
        return f'+213{phone[1:]}'
    return f'+213{phone}'
