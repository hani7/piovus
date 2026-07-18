import logging
import requests
from requests.adapters import HTTPAdapter
import time
import random
import string
import json
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Source-IP adapter ────────────────────────────────────────────────────────
class _SourceAddressAdapter(HTTPAdapter):
    def __init__(self, source_ip, **kwargs):
        self.source_ip = source_ip
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        kwargs['source_address'] = (self.source_ip, 0)
        super().init_poolmanager(*args, **kwargs)


def _session():
    source_ip = getattr(settings, 'SATIM_SOURCE_IP', '') or ''
    s = requests.Session()
    if source_ip:
        adapter = _SourceAddressAdapter(source_ip)
        s.mount('https://', adapter)
        s.mount('http://', adapter)
    return s


def _cfg():
    """Read SATIM credentials dynamically from settings (never cached)."""
    return {
        'base_url':    getattr(settings, 'SATIM_BASE_URL', 'https://cib.satim.dz/payment/rest') or 'https://cib.satim.dz/payment/rest',
        'username':    getattr(settings, 'SATIM_USER_NAME', '') or '',
        'password':    getattr(settings, 'SATIM_PASSWORD', '') or '',
        'terminal_id': getattr(settings, 'SATIM_TERMINAL_ID', '') or '',
    }


def _generate_order_number(order_id):
    rand = ''.join(random.choices(string.ascii_letters, k=2))
    return f"{order_id:05d}{rand}"


# ─── Public API ────────────────────────────────────────────────────────────────

def register_order(order):
    """Register an order with SATIM and return the payment form URL."""
    cfg = _cfg()
    logger.info(f"SATIM register: user={cfg['username']!r} terminal={cfg['terminal_id']!r}")

    if not cfg['username'] or not cfg['password']:
        return {'success': False, 'message': 'Les identifiants SATIM ne sont pas configurés.'}

    amount = int(float(order.total - order.delivery_cost) * 100)
    order_number = _generate_order_number(order.id)

    api_host = getattr(settings, 'API_URL', 'https://api.piovecosmetics.dz')
    return_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    fail_url   = f"{api_host}/api/satim/callback/?order_id={order.id}"

    # Use compact JSON (no spaces) to match PHP json_encode — SATIM validates the format
    json_params = json.dumps(
        {'force_terminal_id': cfg['terminal_id'], 'udf1': str(int(time.time()))},
        separators=(',', ':')
    )

    params = {
        'currency':    '012',
        'amount':      amount,
        'language':    'fr',
        'orderNumber': order_number,
        'userName':    cfg['username'],
        'password':    cfg['password'],
        'returnUrl':   return_url,
        'failUrl':     fail_url,
        'jsonParams':  json_params,
    }

    try:
        resp = _session().get(f"{cfg['base_url']}/register.do", params=params, timeout=15)
        logger.info(f"SATIM register response: {resp.status_code} {resp.text[:300]}")
        resp.raise_for_status()
        data = resp.json()

        if 'orderId' in data and 'formUrl' in data:
            return {'success': True, 'orderId': data['orderId'], 'formUrl': data['formUrl']}

        err = data.get('errorMessage', 'Erreur inconnue SATIM')
        logger.error(f"SATIM register failed: {err} — {data}")
        return {'success': False, 'message': err, 'raw': data}

    except Exception as e:
        logger.error(f"SATIM register exception: {e}")
        return {'success': False, 'message': str(e)}


def confirm_order(satim_order_id):
    """
    Confirm a payment after the user returns from SATIM.
    Uses confirmOrder.do (same as the WordPress plugin — NOT getOrderStatusExtended.do).
    """
    cfg = _cfg()
    if not cfg['username'] or not cfg['password']:
        return {'success': False, 'message': 'SATIM not configured.'}

    params = {
        'language': 'fr',
        'orderId':  satim_order_id,
        'userName': cfg['username'],
        'password': cfg['password'],
    }

    try:
        # NOTE: WordPress plugin uses confirmOrder.do, not getOrderStatusExtended.do
        resp = _session().get(f"{cfg['base_url']}/confirmOrder.do", params=params, timeout=15)
        logger.info(f"SATIM confirm response: {resp.status_code} {resp.text[:300]}")
        resp.raise_for_status()
        data = resp.json()

        error_code   = data.get('ErrorCode') or data.get('errorCode') or '0'
        order_status = data.get('orderStatus') or data.get('OrderStatus')

        if str(error_code) != '0':
            msg = data.get('ErrorMessage') or data.get('errorMessage') or 'Erreur de paiement SATIM.'
            return {'success': False, 'message': msg, 'raw': data}

        # orderStatus 2 = APPROVED/DEPOSITED
        if str(order_status) == '2':
            return {'success': True, 'data': data}

        action = data.get('actionCodeDescription') or 'Paiement non complété.'
        return {'success': False, 'message': action, 'raw': data}

    except Exception as e:
        logger.error(f"SATIM confirm exception: {e}")
        return {'success': False, 'message': str(e)}


def test_satim_connection():
    """Diagnostic endpoint — returns credentials status and a live SATIM test call."""
    cfg = _cfg()

    server_ip = 'unknown'
    try:
        server_ip = requests.get('https://api.ipify.org', timeout=5).text.strip()
    except Exception:
        pass

    result = {
        'server_outbound_ip': server_ip,
        'base_url':     cfg['base_url'],
        'username':     cfg['username'] or '(vide)',
        'password_set': bool(cfg['password']),
        'terminal_id':  cfg['terminal_id'] or '(vide)',
    }

    if not cfg['username'] or not cfg['password']:
        result['error'] = 'Credentials manquants'
        return result

    json_params = json.dumps(
        {'force_terminal_id': cfg['terminal_id'], 'udf1': 'diag'},
        separators=(',', ':')
    )

    params = {
        'currency':    '012',
        'amount':      100000,
        'language':    'fr',
        'orderNumber': f'DIAG{int(time.time())}',
        'userName':    cfg['username'],
        'password':    cfg['password'],
        'returnUrl':   'https://piovecosmetics.dz/payment-result?status=success',
        'failUrl':     'https://piovecosmetics.dz/payment-result?status=fail',
        'jsonParams':  json_params,
    }

    try:
        resp = _session().get(f"{cfg['base_url']}/register.do", params=params, timeout=15)
        result['http_status']  = resp.status_code
        result['raw_response'] = resp.text[:500]
        try:
            result['json_response'] = resp.json()
        except Exception:
            pass
    except Exception as e:
        result['exception'] = str(e)

    return result
