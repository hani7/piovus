import logging
import requests
from requests.adapters import HTTPAdapter
import subprocess
import urllib.parse
import time
import random
import string
import json
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Source-IP adapter (Python-level) ────────────────────────────────────────
class _SourceAddressAdapter(HTTPAdapter):
    def __init__(self, source_ip, **kwargs):
        self.source_ip = source_ip
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        kwargs['source_address'] = (self.source_ip, 0)
        super().init_poolmanager(*args, **kwargs)


def _satim_get(url, params, source_ip=None):
    """
    Makes a GET request to SATIM.
    If SATIM_SOURCE_IP is set, tries curl first (OS-level IP binding).
    Falls back to Python requests.
    """
    if source_ip:
        # Try curl with --interface to bind outbound socket to the whitelisted IP
        try:
            query_string = urllib.parse.urlencode(params)
            full_url = f"{url}?{query_string}"
            cmd = [
                'curl', '-s', '-S',
                '--interface', source_ip,
                '--max-time', '15',
                '--location',
                full_url
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
            if result.returncode == 0 and result.stdout:
                logger.info(f"SATIM curl OK via {source_ip}: {result.stdout[:200]}")

                class _FakeResp:
                    def __init__(self, text):
                        self.text = text
                        self.status_code = 200
                    def json(self):
                        return json.loads(self.text)
                    def raise_for_status(self):
                        pass

                return _FakeResp(result.stdout)
            else:
                logger.warning(f"curl failed (exit {result.returncode}): {result.stderr[:200]} — falling back to requests")
        except Exception as e:
            logger.warning(f"curl exception: {e} — falling back to requests")

    # Fallback: Python requests with optional source_address binding
    session = requests.Session()
    if source_ip:
        adapter = _SourceAddressAdapter(source_ip)
        session.mount('https://', adapter)
        session.mount('http://', adapter)
    return session.get(url, params=params, timeout=15)


def _cfg():
    """Read SATIM credentials dynamically from settings (never cached)."""
    return {
        'base_url':    getattr(settings, 'SATIM_BASE_URL', 'https://cib.satim.dz/payment/rest') or 'https://cib.satim.dz/payment/rest',
        'username':    getattr(settings, 'SATIM_USER_NAME', '') or '',
        'password':    getattr(settings, 'SATIM_PASSWORD', '') or '',
        'terminal_id': getattr(settings, 'SATIM_TERMINAL_ID', '') or '',
        'source_ip':   getattr(settings, 'SATIM_SOURCE_IP', '') or '',
    }


def _generate_order_number(order_id):
    rand = ''.join(random.choices(string.ascii_letters, k=2))
    return f"{order_id:05d}{rand}"


# ─── Public API ────────────────────────────────────────────────────────────────

def register_order(order):
    """Register an order with SATIM and return the payment form URL."""
    cfg = _cfg()
    logger.info(f"SATIM register: user={cfg['username']!r} terminal={cfg['terminal_id']!r} source_ip={cfg['source_ip']!r}")

    if not cfg['username'] or not cfg['password']:
        return {'success': False, 'message': 'Les identifiants SATIM ne sont pas configurés.'}

    amount = int(float(order.total - order.delivery_cost) * 100)
    order_number = _generate_order_number(order.id)

    api_host   = getattr(settings, 'API_URL', 'https://api.piovecosmetics.dz')
    return_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    fail_url   = f"{api_host}/api/satim/callback/?order_id={order.id}"

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
        resp = _satim_get(f"{cfg['base_url']}/register.do", params, cfg['source_ip'])
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
        resp = _satim_get(f"{cfg['base_url']}/confirmOrder.do", params, cfg['source_ip'])
        logger.info(f"SATIM confirm response: {resp.status_code} {resp.text[:300]}")
        resp.raise_for_status()
        data = resp.json()

        error_code   = data.get('ErrorCode') or data.get('errorCode') or '0'
        order_status = data.get('orderStatus') or data.get('OrderStatus')

        if str(error_code) != '0':
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
    """Diagnostic: test SATIM credentials and curl/requests connectivity."""
    cfg = _cfg()

    # Detect outbound IP via Python requests (no binding)
    server_ip_requests = 'unknown'
    try:
        server_ip_requests = requests.get('https://api.ipify.org', timeout=5).text.strip()
    except Exception:
        pass

    # Detect outbound IP via curl with --interface binding
    server_ip_curl = 'unknown'
    curl_available = False
    if cfg['source_ip']:
        try:
            r = subprocess.run(
                ['curl', '-s', '--interface', cfg['source_ip'], '--max-time', '5', 'https://api.ipify.org'],
                capture_output=True, text=True, timeout=8
            )
            if r.returncode == 0:
                server_ip_curl = r.stdout.strip()
                curl_available = True
            else:
                server_ip_curl = f"curl_error: {r.stderr[:100]}"
        except Exception as e:
            server_ip_curl = f"exception: {e}"

    result = {
        'server_ip_requests': server_ip_requests,
        'server_ip_curl':     server_ip_curl,
        'curl_available':     curl_available,
        'source_ip_cfg':      cfg['source_ip'] or '(not set)',
        'base_url':           cfg['base_url'],
        'username':           cfg['username'] or '(vide)',
        'password_set':       bool(cfg['password']),
        'terminal_id':        cfg['terminal_id'] or '(vide)',
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
        resp = _satim_get(f"{cfg['base_url']}/register.do", params, cfg['source_ip'])
        result['http_status']  = resp.status_code
        result['raw_response'] = resp.text[:500]
        try:
            result['json_response'] = resp.json()
        except Exception:
            pass
    except Exception as e:
        result['exception'] = str(e)

    return result
