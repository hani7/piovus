import logging
import requests
import time
import random
import string
import json
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_cfg():
    """Read SATIM credentials fresh from settings every call (avoids module-level caching)."""
    return {
        'base_url': getattr(settings, 'SATIM_BASE_URL', 'https://cib.satim.dz/payment/rest') or 'https://cib.satim.dz/payment/rest',
        'username': getattr(settings, 'SATIM_USER_NAME', '') or '',
        'password': getattr(settings, 'SATIM_PASSWORD', '') or '',
        'terminal_id': getattr(settings, 'SATIM_TERMINAL_ID', '') or '',
    }


def _generate_order_number(order_id):
    rand_str = ''.join(random.choices(string.ascii_letters, k=2))
    return f"{order_id:05d}{rand_str}"


def register_order(order):
    """
    Registers an order with SATIM to get the payment form URL.
    """
    cfg = _get_cfg()
    logger.info(f"SATIM register_order: base_url={cfg['base_url']!r}, user={cfg['username']!r}, terminal={cfg['terminal_id']!r}")

    if not cfg['username'] or not cfg['password']:
        logger.error("SATIM credentials are not configured.")
        return {'success': False, 'message': 'Les identifiants SATIM ne sont pas configurés.'}

    url = f"{cfg['base_url']}/register.do"

    # Amount is in cents (DA * 100). We exclude delivery cost from the SATIM payment
    # so the customer pays it directly to the delivery driver.
    amount = int(float(order.total - order.delivery_cost) * 100)
    order_number = _generate_order_number(order.id)

    api_host = getattr(settings, 'API_URL', 'https://api.piovecosmetics.dz')
    return_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    fail_url = f"{api_host}/api/satim/callback/?order_id={order.id}"

    json_params = {
        "force_terminal_id": cfg['terminal_id'],
        "udf1": str(int(time.time()))
    }

    params = {
        'currency': '012',
        'amount': amount,
        'language': 'fr',
        'orderNumber': order_number,
        'userName': cfg['username'],
        'password': cfg['password'],
        'returnUrl': return_url,
        'failUrl': fail_url,
        'jsonParams': json.dumps(json_params)
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        logger.info(f"SATIM register response: status={resp.status_code}, body={resp.text[:300]}")
        resp.raise_for_status()
        data = resp.json()

        if 'orderId' in data and 'formUrl' in data:
            return {
                'success': True,
                'orderId': data['orderId'],
                'formUrl': data['formUrl']
            }
        else:
            err = data.get('errorMessage', 'Erreur inconnue SATIM')
            logger.error(f"SATIM register failed: {err} - Response: {data}")
            return {'success': False, 'message': err}

    except Exception as e:
        logger.error(f"SATIM register request exception: {e}")
        return {'success': False, 'message': str(e)}


def confirm_order(satim_order_id):
    """
    Called when the user returns from SATIM.
    """
    cfg = _get_cfg()
    if not cfg['username'] or not cfg['password']:
        return {'success': False, 'message': 'SATIM not configured.'}

    url = f"{cfg['base_url']}/getOrderStatusExtended.do"

    params = {
        'language': 'fr',
        'orderId': satim_order_id,
        'userName': cfg['username'],
        'password': cfg['password']
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        error_code = data.get('ErrorCode') or data.get('errorCode')
        order_status = data.get('orderStatus') or data.get('OrderStatus')

        if error_code and str(error_code) != '0':
            msg = data.get('ErrorMessage') or data.get('errorMessage') or 'Erreur de paiement SATIM.'
            return {'success': False, 'message': msg, 'raw': data}

        if str(order_status) == '2':
            return {'success': True, 'data': data}
        else:
            action_code = data.get('actionCodeDescription') or 'Paiement non complété.'
            return {'success': False, 'message': action_code, 'raw': data}

    except Exception as e:
        logger.error(f"SATIM confirm request exception: {e}")
        return {'success': False, 'message': str(e)}


def test_satim_connection():
    """Diagnostic: test SATIM credentials and return detailed info."""
    cfg = _get_cfg()
    result = {
        'base_url': cfg['base_url'],
        'username': cfg['username'] or '(vide)',
        'password_set': bool(cfg['password']),
        'terminal_id': cfg['terminal_id'] or '(vide)',
    }
    if not cfg['username'] or not cfg['password']:
        result['error'] = 'Credentials manquants'
        return result

    url = f"{cfg['base_url']}/register.do"
    params = {
        'currency': '012',
        'amount': 100000,  # 1000 DA test
        'language': 'fr',
        'orderNumber': f'DIAG{int(time.time())}',
        'userName': cfg['username'],
        'password': cfg['password'],
        'returnUrl': 'https://piovecosmetics.dz/payment-result?status=success',
        'failUrl': 'https://piovecosmetics.dz/payment-result?status=fail',
        'jsonParams': json.dumps({'force_terminal_id': cfg['terminal_id'], 'udf1': 'diag'})
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        result['http_status'] = resp.status_code
        result['raw_response'] = resp.text[:500]
        try:
            result['json_response'] = resp.json()
        except Exception:
            pass
    except Exception as e:
        result['exception'] = str(e)
    return result



