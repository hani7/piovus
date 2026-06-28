import logging
import requests
import time
import random
import string
import json
from django.conf import settings

logger = logging.getLogger(__name__)

# Fallbacks for sandbox
SATIM_BASE_URL = getattr(settings, 'SATIM_BASE_URL', 'https://test.satim.dz/payment/rest')
SATIM_USER_NAME = getattr(settings, 'SATIM_USER_NAME', '')
SATIM_PASSWORD = getattr(settings, 'SATIM_PASSWORD', '')
SATIM_TERMINAL_ID = getattr(settings, 'SATIM_TERMINAL_ID', '')

def _generate_order_number(order_id):
    """
    Format: 0000X + 2 random characters
    """
    rand_str = ''.join(random.choices(string.ascii_letters, k=2))
    return f"{order_id:05d}{rand_str}"

def register_order(order):
    """
    Registers an order with SATIM to get the payment form URL.
    """
    if not SATIM_USER_NAME or not SATIM_PASSWORD:
        logger.error("SATIM credentials are not configured.")
        return {'success': False, 'message': 'Les identifiants SATIM ne sont pas configurés.'}

    url = f"{SATIM_BASE_URL}/register.do"
    
    # Amount is in cents (DA * 100). We exclude delivery cost from the SATIM payment 
    # so the customer pays it directly to the delivery driver.
    amount = int(float(order.total - order.delivery_cost) * 100)
    order_number = _generate_order_number(order.id)
    
    # Save the order_number temporarily to the order if we want to cross-check later,
    # but we can just rely on the wooId/order_id we pass in the returnUrl.
    
    api_host = getattr(settings, 'API_URL', 'https://api.piovecosmetics.dz')

    return_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    fail_url = f"{api_host}/api/satim/callback/?order_id={order.id}"
    
    json_params = {
        "force_terminal_id": SATIM_TERMINAL_ID,
        "udf1": str(int(time.time()))
    }

    params = {
        'currency': '012',
        'amount': amount,
        'language': 'fr',
        'orderNumber': order_number,
        'userName': SATIM_USER_NAME,
        'password': SATIM_PASSWORD,
        'returnUrl': return_url,
        'failUrl': fail_url,
        'jsonParams': json.dumps(json_params)
    }

    try:
        # The PHP script did a GET request with all params in the URL.
        resp = requests.get(url, params=params, timeout=15)
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
    We need to check the exact status of the transaction.
    """
    if not SATIM_USER_NAME or not SATIM_PASSWORD:
        return {'success': False, 'message': 'SATIM not configured.'}

    url = f"{SATIM_BASE_URL}/confirmOrder.do"
    
    params = {
        'language': 'fr',
        'orderId': satim_order_id,
        'userName': SATIM_USER_NAME,
        'password': SATIM_PASSWORD
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        # SATIM returns params['respCode_desc'], 'Amount', 'OrderNumber', 'approvalCode' in 'params'
        # The exact JSON structure requires us to check if there is an error
        error_code = data.get('ErrorCode') or data.get('errorCode')
        if error_code and str(error_code) != '0':
            msg = data.get('ErrorMessage') or data.get('errorMessage') or 'Erreur de paiement.'
            return {'success': False, 'message': msg, 'raw': data}
            
        return {
            'success': True,
            'data': data
        }
            
    except Exception as e:
        logger.error(f"SATIM confirm request exception: {e}")
        return {'success': False, 'message': str(e)}
