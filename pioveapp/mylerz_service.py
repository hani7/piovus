"""
Mylerz Algeria Delivery API Service
Wraps all Mylerz API calls: authentication, shipment creation, tracking, cancellation.
"""

import os
import requests
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Module-level vars — kept for backward compat with views.py credential checks.
# The actual functions below always read settings dynamically at call time.
MYLERZ_BASE_URL = getattr(settings, 'MYLERZ_BASE_URL', 'https://integration.algeria.mylerz.net')
MYLERZ_USERNAME = getattr(settings, 'MYLERZ_USERNAME', '') or ''
MYLERZ_PASSWORD = getattr(settings, 'MYLERZ_PASSWORD', '') or ''
MYLERZ_WAREHOUSE = getattr(settings, 'MYLERZ_WAREHOUSE_NAME', '') or ''

CACHE_KEY = 'mylerz_access_token'
TOKEN_TTL = 60 * 50  # 50 minutes (tokens typically last 60 min)

# Dynamic config helpers — read os.environ directly (more reliable than settings on cPanel)
def _cfg_base_url():
    return (os.environ.get('MYLERZ_BASE_URL') or getattr(settings, 'MYLERZ_BASE_URL', '') or 'https://integration.algeria.mylerz.net').strip()

def _cfg_username():
    return (os.environ.get('MYLERZ_USERNAME') or getattr(settings, 'MYLERZ_USERNAME', '') or '').strip()

def _cfg_password():
    return (os.environ.get('MYLERZ_PASSWORD') or getattr(settings, 'MYLERZ_PASSWORD', '') or '').strip()

def _cfg_warehouse():
    return (os.environ.get('MYLERZ_WAREHOUSE_NAME') or getattr(settings, 'MYLERZ_WAREHOUSE_NAME', '') or '').strip()



# ─── Authentication ───────────────────────────────────────────────────────────

def get_mylerz_token():
    """
    Authenticate with Mylerz and return a Bearer token.
    Caches the token for TOKEN_TTL seconds to avoid repeated auth calls.
    """
    username = _cfg_username()
    password = _cfg_password()
    base_url = _cfg_base_url()

    token = cache.get(CACHE_KEY)
    if token:
        return token

    if not username or not password:
        raise ValueError("Mylerz credentials are not configured. Set MYLERZ_USERNAME and MYLERZ_PASSWORD in .env")

    try:
        resp = requests.post(
            f"{base_url}/token",
            data={
                'grant_type': 'password',
                'username': username,
                'password': password,
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get('access_token')
        if not token:
            raise ValueError(f"No access_token in Mylerz response: {data}")
        cache.set(CACHE_KEY, token, TOKEN_TTL)
        logger.info("Mylerz: Token obtained and cached.")
        return token
    except requests.RequestException as e:
        logger.error(f"Mylerz auth error: {e}")
        raise


def _auth_headers():
    token = get_mylerz_token()
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }


# ─── Shipment Creation ────────────────────────────────────────────────────────

def create_shipment(order):
    """
    Create a shipment on Mylerz for the given Order instance.
    Returns a dict with: barcode, pickup_code, success, message
    """
    # Build description from order items
    items_summary = ', '.join(
        f"{item.product_name} x{item.quantity}"
        for item in order.items.all()
    )
    if not items_summary:
        items_summary = f"Commande #{order.id}"

    # Determine customer info — priority: Customer record > User profile > Guest fields
    customer_name = ''
    mobile_no = ''
    customer_email = ''

    # 1. Try order.customer (most reliable — has direct phone field)
    if order.customer:
        customer_name = order.customer.name or ''
        mobile_no = order.customer.phone or ''
        customer_email = order.customer.email or ''

    # 2. Try logged-in user + UserProfile
    if order.user:
        if not customer_name:
            customer_name = order.user.get_full_name() or order.user.username or ''
        if not customer_email:
            customer_email = order.user.email or ''
        if not mobile_no:
            try:
                mobile_no = order.user.profile.phone or ''
            except Exception:
                mobile_no = ''

    # 3. Fallback to guest fields
    if not customer_name:
        customer_name = order.guest_name or 'Client'
    if not mobile_no:
        mobile_no = order.guest_phone or ''
    if not customer_email:
        customer_email = order.guest_email or ''

    # Clean phone number (Mylerz is strict on format, invalid chars can cause 500)
    import re
    mobile_no = re.sub(r'[^\d\+]', '', mobile_no)
    if not mobile_no:
        mobile_no = '0000000000'

    logger.info(f"Mylerz create_shipment order #{order.id}: name={customer_name!r}, phone={mobile_no!r}, email={customer_email!r}")

    # Determine payment type
    # If COD (cash on delivery) → Payment_Type = "Cash", COD_Value = total
    # If pre-paid → Payment_Type = "Prepaid", COD_Value = "0"
    if order.payment_method == 'cib':
        payment_type = 'PP'
        cod_value = 0.0
    else:
        payment_type = 'COD'
        cod_value = float(order.total)

    # Address fields — map Piové fields to Mylerz fields
    # Mylerz Algeria requires City (Wilaya) and Neighborhood (Commune/City)
    city = order.wilaya or 'Alger'
    neighborhood = order.city or city
    street = order.shipping_address or neighborhood
    district = neighborhood

    # Mylerz Algeria Address_Category is H or C or B
    address_category = 'H'

    import datetime
    now = datetime.datetime.now()
    pickup_date = (now + datetime.timedelta(days=1)).isoformat()
    # Use timestamp suffix on Reference to avoid duplicate rejection if previously attempted
    ref_unique = f"{order.id}-{int(now.timestamp())}"

    # Calculate real weight — protect against deleted products (item.product = None)
    total_weight = 0.0
    for item in order.items.all():
        try:
            w = float(getattr(item.product, 'weight_box', None) or 0)
        except Exception:
            w = 0.0
        if w <= 0:
            w = 0.1
        total_weight += w * item.quantity

    if total_weight < 0.1:
        total_weight = 0.5  # safe minimum

    payload = [
        {
            "PickupDueDate": pickup_date,
            "Package_Serial": order.id,  # integer per API docs
            "Description": items_summary[:200],
            "Total_Weight": round(total_weight, 2),
            "Service_Type": "DTD",
            "Service": "ND",
            "Service_Category": "Delivery",
            "Payment_Type": payment_type,
            "COD_Value": cod_value,
            "Pieces": [{"pieceNo": 1, "Weight": round(total_weight, 2)}],
            "Customer_Name": customer_name,
            "Customer_Email": customer_email,
            "Mobile_No": mobile_no,
            "Street": street,
            "City": city,
            "Neighborhood": neighborhood,
            "District": district,
            "Address_Category": address_category,
            "Special_Notes": getattr(order, 'notes', '') or '',
            "Reference": ref_unique,  # unique per attempt to avoid duplicate rejection
            "AllowToOpenPackage": True,
            "ValueOfGoods": float(order.total),
            "Country": "DZ",
        }
    ]

    # WarehouseName = Lieu de ramassage (pickup location name in Mylerz portal)
    # This is often strictly required and causes an HTTP 500 if omitted or empty
    warehouse = _cfg_warehouse()
    if not warehouse:
        return {'success': False, 'barcode': None, 'pickup_code': None, 'message': "MYLERZ_WAREHOUSE_NAME n'est pas configuré dans le fichier .env.", 'raw': None}
    
    payload[0]["WarehouseName"] = warehouse
    logger.info(f"Mylerz order #{order.id}: warehouse={warehouse!r}, city={city!r}, phone={mobile_no!r}, weight={total_weight}, payment={payment_type}, cod={cod_value}")

    try:
        resp = requests.post(
            f"{_cfg_base_url()}/api/Orders/AddOrders",
            json=payload,
            headers=_auth_headers(),
            timeout=20,
        )
        # Don't use raise_for_status — we want to read the body even on HTTP error
        try:
            data = resp.json()
        except Exception:
            data = {'raw_text': resp.text, 'status_code': resp.status_code}

        logger.info(f"Mylerz AddOrders HTTP {resp.status_code} for order #{order.id}: {data}")

        if resp.status_code >= 400:
            # HTTP error — extract message from response body
            msg = (
                data.get('Message') or
                data.get('message') or
                data.get('ErrorDescription') or
                data.get('error_description')
            )
            
            if not msg and data.get('raw_text'):
                raw = data.get('raw_text')
                import re
                match = re.search(r'<title>(.*?)</title>', raw, re.IGNORECASE | re.DOTALL)
                if match:
                    msg = "Erreur interne Mylerz: " + match.group(1).replace('<br>', ' - ').strip()
                else:
                    msg = raw[:200] + "..." # Truncate raw text
                    
            if not msg:
                msg = f"Erreur HTTP {resp.status_code} de l'API Mylerz."
                
            logger.warning(f"Mylerz HTTP {resp.status_code} for order #{order.id}: {msg}")
            return {'success': False, 'barcode': None, 'pickup_code': None, 'message': msg, 'raw': data}

        # Parse response — Mylerz V1.3 uses IsErrorState and Value.Packages
        is_error = data.get('IsErrorState', True)
        if not is_error:
            val = data.get('Value') or {}
            packages = val.get('Packages') or []
            barcode = None
            pickup_code = val.get('PickupOrderCode')
            if packages:
                first = packages[0]
                barcode = first.get('BarCode') or first.get('Barcode')
                
            return {
                'success': True,
                'barcode': barcode,
                'pickup_code': pickup_code,
                'message': 'Colis créé avec succès.',
                'raw': data,
            }
        else:
            # Try to extract the error message
            val = data.get('Value') or {}
            msg = val.get('ErrorMessage') or data.get('ErrorDescription') or data.get('Message') or f"Erreur Mylerz: {data}"
            logger.warning(f"Mylerz shipment failed for order #{order.id}: {msg}")
            return {'success': False, 'barcode': None, 'pickup_code': None, 'message': msg, 'raw': data}

    except requests.RequestException as e:
        logger.error(f"Mylerz create_shipment error for order #{order.id}: {e}")
        return {'success': False, 'barcode': None, 'pickup_code': None, 'message': str(e), 'raw': None}


# ─── Tracking ─────────────────────────────────────────────────────────────────

def track_shipment(barcode):
    """
    Get live tracking data for a given barcode from Mylerz.
    Returns list of tracking events or error dict.
    """
    payload = [{"Barcode": barcode}]
    try:
        resp = requests.post(
            f"{MYLERZ_BASE_URL}/api/packages/TrackPackages",
            json=payload,
            headers=_auth_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Mylerz track response for {barcode}: {data}")

        if data.get('IsSuccess') or data.get('isSuccess'):
            result_list = data.get('Data') or data.get('data') or []
            return {'success': True, 'tracking': result_list, 'raw': data}
        else:
            msg = data.get('Message') or data.get('message') or 'Erreur de suivi.'
            return {'success': False, 'tracking': [], 'message': msg, 'raw': data}

    except requests.RequestException as e:
        logger.error(f"Mylerz track_shipment error for {barcode}: {e}")
        return {'success': False, 'tracking': [], 'message': str(e), 'raw': None}


# ─── Cancellation ─────────────────────────────────────────────────────────────

def cancel_shipment(barcode):
    """
    Cancel a shipment on Mylerz by barcode.
    Returns success/failure dict.
    """
    payload = [{"Barcode": barcode}]
    try:
        resp = requests.post(
            f"{MYLERZ_BASE_URL}/api/packages/CancelPackage",
            json=payload,
            headers=_auth_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Mylerz cancel response for {barcode}: {data}")

        if data.get('IsSuccess') or data.get('isSuccess'):
            return {'success': True, 'message': data.get('Message') or 'Colis annulé avec succès.', 'raw': data}
        else:
            msg = data.get('Message') or data.get('message') or 'Erreur lors de l\'annulation.'
            return {'success': False, 'message': msg, 'raw': data}

    except requests.RequestException as e:
        logger.error(f"Mylerz cancel_shipment error for {barcode}: {e}")
        return {'success': False, 'message': str(e), 'raw': None}


# ─── City / Zone List ─────────────────────────────────────────────────────────

def get_city_zones():
    """
    Fetch the list of all cities and zones available on Mylerz Algeria.
    Results are cached for 24 hours.
    """
    cache_key = 'mylerz_city_zones'
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        resp = requests.get(
            f"{MYLERZ_BASE_URL}/api/packages/GetCityZoneList",
            headers=_auth_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        cities = data.get('Data') or data.get('data') or []
        cache.set(cache_key, cities, 60 * 60 * 24)  # 24h cache
        return cities
    except requests.RequestException as e:
        logger.error(f"Mylerz get_city_zones error: {e}")
        return []
