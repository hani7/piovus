import logging
import requests
from requests.adapters import HTTPAdapter
import time
import random
import string
import json
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Source-IP adapter (binds outbound socket to a specific local IP) ──────────
class _SourceAddressAdapter(HTTPAdapter):
    def __init__(self, source_ip, **kwargs):
        self.source_ip = source_ip
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        kwargs['source_address'] = (self.source_ip, 0)
        super().init_poolmanager(*args, **kwargs)


def _session():
    """Returns a requests.Session, optionally bound to SATIM_SOURCE_IP."""
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
        'base_url':      getattr(settings, 'SATIM_BASE_URL', 'https://cib.satim.dz/payment/rest') or 'https://cib.satim.dz/payment/rest',
        'username':      getattr(settings, 'SATIM_USER_NAME', '') or '',
        'password':      getattr(settings, 'SATIM_PASSWORD', '') or '',
        'terminal_id':   getattr(settings, 'SATIM_TERMINAL_ID', '') or '',
        'proxy_url':     getattr(settings, 'SATIM_PROXY_URL', '') or '',
        'proxy_secret':  getattr(settings, 'SATIM_PROXY_SECRET', '') or '',
    }


def _satim_request(endpoint, params):
    """
    Makes a GET request to a SATIM endpoint.
    Routes through PHP proxy (app.piovecosmetics.dz) if SATIM_PROXY_URL is set,
    which fixes the IP whitelist issue (proxy runs from whitelisted IP 157.90.66.76).
    """
    cfg = _cfg()
    session = _session()

    if cfg['proxy_url'] and cfg['proxy_secret']:
        # Route through WordPress PHP proxy (whitelisted IP)
        proxy_params = dict(params)
        proxy_params['_endpoint']    = endpoint
        proxy_params['_proxy_token'] = cfg['proxy_secret']
        logger.info(f"SATIM via proxy: endpoint={endpoint!r}")
        return session.get(cfg['proxy_url'], params=proxy_params, timeout=20)
    else:
        # Direct call
        url = f"{cfg['base_url']}/{endpoint}"
        logger.info(f"SATIM direct: {url!r}")
        return session.get(url, params=params, timeout=15)


def _generate_order_number(order_id):
    rand = ''.join(random.choices(string.ascii_letters, k=2))
    return f"{order_id:05d}{rand}"


# ─── Public API ────────────────────────────────────────────────────────────────

def register_order(order):
    """Register an order with SATIM and return the payment form URL."""
    cfg = _cfg()
    logger.info(f"SATIM register: url={cfg['base_url']!r} user={cfg['username']!r} terminal={cfg['terminal_id']!r}")

    if not cfg['username'] or not cfg['password']:
        return {'success': False, 'message': 'Les identifiants SATIM ne sont pas configurés.'}

    amount = int(float(order.total - order.delivery_cost) * 100)
    order_number = _generate_order_number(order.id)

    api_host = getattr(settings, 'API_URL', 'https://api.piovecosmetics.dz')
    return_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    fail_url   = f"{api_host}/api/satim/callback/?order_id={order.id}"

    params = {
        'currency':    '012',
        'amount':      amount,
        'language':    'fr',
        'orderNumber': order_number,
        'userName':    cfg['username'],
        'password':    cfg['password'],
        'returnUrl':   return_url,
        'failUrl':     fail_url,
        'jsonParams':  json.dumps(
            {'force_terminal_id': cfg['terminal_id'], 'udf1': str(int(time.time()))},
            separators=(',', ':')   # compact — matches PHP json_encode
        ),
    }

    try:
        resp = _satim_request('register.do', params)
        logger.info(f"SATIM register response: {resp.status_code} {resp.text[:300]}")
        resp.raise_for_status()
        data = resp.json()

        if 'orderId' in data and 'formUrl' in data:
            return {'success': True, 'orderId': data['orderId'], 'formUrl': data['formUrl']}

        err = data.get('errorMessage', 'Erreur inconnue SATIM')
        logger.error(f"SATIM register failed: {err} — {data}")
        return {'success': False, 'message': err}

    except Exception as e:
        logger.error(f"SATIM register exception: {e}")
        return {'success': False, 'message': str(e)}


def confirm_order(satim_order_id):
    """Confirm a payment after the user returns from SATIM."""
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
        resp = _satim_request('getOrderStatusExtended.do', params)
        resp.raise_for_status()
        data = resp.json()

        error_code   = data.get('ErrorCode') or data.get('errorCode')
        order_status = data.get('orderStatus') or data.get('OrderStatus')

        if error_code and str(error_code) != '0':
            msg = data.get('ErrorMessage') or data.get('errorMessage') or 'Erreur de paiement SATIM.'
            return {'success': False, 'message': msg, 'raw': data}

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

    # Detect server outbound IP
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

    params = {
        'currency':    '012',
        'amount':      100000,
        'language':    'fr',
        'orderNumber': f'DIAG{int(time.time())}',
        'userName':    cfg['username'],
        'password':    cfg['password'],
        'returnUrl':   'https://piovecosmetics.dz/payment-result?status=success',
        'failUrl':     'https://piovecosmetics.dz/payment-result?status=fail',
        'jsonParams':  json.dumps({'force_terminal_id': cfg['terminal_id'], 'udf1': 'diag'}, separators=(',', ':')),
    }

    try:
        resp = _satim_request('register.do', params)
        result['http_status']  = resp.status_code
        result['raw_response'] = resp.text[:500]
        try:
            result['json_response'] = resp.json()
        except Exception:
            pass
    except Exception as e:
        result['exception'] = str(e)

    return result
