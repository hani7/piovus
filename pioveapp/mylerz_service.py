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

# ─── Wilaya Normalization ──────────────────────────────────────────────────────
# Maps any format (name only, "N - Name", partial) → exact Mylerz Algeria city name
# Index 0 = wilaya number (1-based), value = exact Mylerz name

# ─── Wilaya → Mylerz City Name Mapping ──────────────────────────────────────
# Mylerz Algeria uses specific city names (no accents, specific spelling).
# This maps EVERY possible form the frontend/user might send → exact Mylerz city name.
# Verified against Mylerz Algeria GetCityZoneList API (Zone.EnName values).

WILAYA_LIST = [
    "Adrar",               # 01
    "Chlef",               # 02
    "Laghouat",            # 03
    "Oum el Bouaghi",      # 04 — Mylerz: "Oum el Bouaghi" (pas "Oum El Bouaghi")
    "Batna",               # 05
    "Bejaia",              # 06
    "Biskra",              # 07
    "Bechar",              # 08
    "Blida",               # 09
    "Bouira",              # 10
    "Tamanghasset",        # 11 — Mylerz: "Tamanghasset" (pas "Tamanrasset")
    "Tebessa",             # 12
    "Tlemcen",             # 13
    "Tiaret",              # 14
    "Tizi Ouzou",          # 15
    "Alger",               # 16
    "Djelfa",              # 17
    "Jijel",               # 18
    "Setif",               # 19
    "Saida",               # 20
    "Skikda",              # 21
    "Sidi Bel Abbes",      # 22
    "Annaba",              # 23
    "Guelma",              # 24
    "Constantine",         # 25
    "Medea",               # 26
    "Mostaganem",          # 27
    "M Sila",              # 28 — Mylerz: "M Sila" (pas "M'Sila")
    "Mascara",             # 29
    "Ouargla",             # 30
    "Oran",                # 31
    "El Bayadh",           # 32
    "Illizi",              # 33
    "Bordj Bou Arreridj",  # 34
    "Boumerdes",           # 35
    "El Tarf",             # 36
    "Tindouf",             # 37
    "Tissemsilt",          # 38
    "El Oued",             # 39
    "Khenchela",           # 40
    "Souk Ahras",          # 41
    "Tipaza",              # 42
    "Mila",                # 43
    "Ain Defla",           # 44
    "Naama",               # 45
    "Ain Temouchent",      # 46
    "Ghardaia",            # 47
    "Relizane",            # 48
    "Timimoun",            # 49
    "Bordj Badji Mokhtar", # 50
    "Ouled Djellal",       # 51
    "Beni Abbes",          # 52
    "In Salah",            # 53
    "In Guezzam",          # 54
    "Touggourt",           # 55
    "Djanet",              # 56
    "El M Ghair",          # 57 — Mylerz: "El M Ghair" (pas "El M'Ghair")
    "El Meniaa",           # 58
]

# ─── Mylerz City Codes ───────────────────────────────────────────────────────
# Maps zone EnName → Mylerz City Code (from GetCityZoneList API).
# Using City Codes instead of zone names routes packages to the CORRECT hub
# (e.g. CLF for Chlef, LGH for Laghouat) instead of defaulting to ALG (Alger).
# Verified 2026-07-31 from production Mylerz Algeria API.
MYLERZ_CITY_CODES = {
    "Blida": "BLD",
    "Alger": "ALG",
    "Boumerdes": "BRD",
    "Tipaza": "TPZ",
    "Adrar": "Adra",
    "Chlef": "Chle",
    "Laghouat": "Laghoua",
    "Oum el Bouaghi": "Oum El Bouagh",
    "Batna": "Batn",
    "Bejaia": "Bejai",
    "Biskra": "Biskr",
    "Bechar": "Becha",
    "Bouira": "Bouir",
    "Tamanghasset": "Tamanghasse",
    "Tebessa": "Tebess",
    "Tlemcen": "Tlemce",
    "Tiaret": "Tiare",
    "Tizi Ouzou": "Tizi Ouzo",
    "Djelfa": "Djelf",
    "Jijel": "Jije",
    "Setif": "Seti",
    "Saida": "Said",
    "Skikda": "Skikd",
    "Sidi Bel Abbes": "Sidi Bel Abbe",
    "Annaba": "Annab",
    "Guelma": "Guelm",
    "Constantine": "Constantin",
    "Medea": "Mede",
    "Mostaganem": "Mostagane",
    "M Sila": "M Sil",
    "Mascara": "Mascar",
    "Ouargla": "Ouargl",
    "Oran": "Ora",
    "El Bayadh": "El Bayad",
    "Illizi": "Illiz",
    "Bordj Bou Arreridj": "Bordj Bou Arrerid",
    "El Tarf": "El Tar",
    "Tindouf": "Tindou",
    "Tissemsilt": "Tissemsil",
    "El Oued": "El Oue",
    "Khenchela": "Khenchel",
    "Souk Ahras": "Souk Ahra",
    "Mila": "Mil",
    "Ain Defla": "Ain Defl",
    "Naama": "Naam",
    "Ain Temouchent": "Ain Temouchen",
    "Ghardaia": "Ghardai",
    "Relizane": "Relizan",
    "El M Ghair": "El M Ghai",
    "El Meniaa": "El Menia",
    "Ouled Djellal": "Ouled Djella",
    "Bordj Badji Mokhtar": "Bordj Badji Mokhta",
    "Beni Abbes": "Beni Abbe",
    "Timimoun": "Timimou",
    "Touggourt": "Touggour",
    "Djanet": "Djane",
    "In Salah": "In Sala",
    "In Guezzam": "In Guezza",
}

# Exhaustive alias map: any form the frontend/user might send → exact Mylerz name
# Keys are lowercase. Covers accented French, unaccented, partial, Arabic transliterations.
_WILAYA_ALIASES = {
    # 01 Adrar
    "adrar": "Adrar",
    # 02 Chlef
    "chlef": "Chlef", "ech cheliff": "Chlef", "el asnam": "Chlef",
    # 03 Laghouat
    "laghouat": "Laghouat", "el aghouat": "Laghouat",
    # 04 Oum El Bouaghi
    "oum el bouaghi": "Oum el Bouaghi", "oum el-bouaghi": "Oum el Bouaghi", "oum bouaghi": "Oum el Bouaghi",
    # 05 Batna
    "batna": "Batna",
    # 06 Bejaia
    "bejaia": "Bejaia", "béjaïa": "Bejaia", "bejaia": "Bejaia", "bgayet": "Bejaia", "bejaïa": "Bejaia", "béjaia": "Bejaia",
    # 07 Biskra
    "biskra": "Biskra",
    # 08 Bechar
    "bechar": "Bechar", "béchar": "Bechar",
    # 09 Blida
    "blida": "Blida", "el boulaida": "Blida",
    # 10 Bouira
    "bouira": "Bouira",
    # 11 Tamanrasset / Tamanghasset
    "tamanrasset": "Tamanghasset", "tamanghasset": "Tamanghasset",
    # 12 Tebessa
    "tebessa": "Tebessa", "tébessa": "Tebessa", "tbessa": "Tebessa",
    # 13 Tlemcen
    "tlemcen": "Tlemcen", "tilimsen": "Tlemcen",
    # 14 Tiaret
    "tiaret": "Tiaret",
    # 15 Tizi Ouzou
    "tizi ouzou": "Tizi Ouzou", "tizi-ouzou": "Tizi Ouzou", "tizi ouzzou": "Tizi Ouzou",
    # 16 Alger
    "alger": "Alger", "algiers": "Alger", "alger centre": "Alger",
    # 17 Djelfa
    "djelfa": "Djelfa",
    # 18 Jijel
    "jijel": "Jijel",
    # 19 Setif
    "setif": "Setif", "sétif": "Setif", "setif": "Setif",
    # 20 Saida
    "saida": "Saida", "saïda": "Saida",
    # 21 Skikda
    "skikda": "Skikda",
    # 22 Sidi Bel Abbes
    "sidi bel abbes": "Sidi Bel Abbes", "sidi bel abbès": "Sidi Bel Abbes",
    "sidi-bel-abbes": "Sidi Bel Abbes", "sidi bel-abbes": "Sidi Bel Abbes",
    # 23 Annaba
    "annaba": "Annaba", "bone": "Annaba",
    # 24 Guelma
    "guelma": "Guelma",
    # 25 Constantine
    "constantine": "Constantine", "qacentina": "Constantine",
    # 26 Medea
    "medea": "Medea", "médéa": "Medea", "medéa": "Medea", "médea": "Medea",
    # 27 Mostaganem
    "mostaganem": "Mostaganem",
    # 28 M'Sila
    "m'sila": "M Sila", "msila": "M Sila", "m sila": "M Sila",
    # 29 Mascara
    "mascara": "Mascara",
    # 30 Ouargla
    "ouargla": "Ouargla", "wargla": "Ouargla",
    # 31 Oran
    "oran": "Oran", "wahran": "Oran",
    # 32 El Bayadh
    "el bayadh": "El Bayadh", "el-bayadh": "El Bayadh",
    # 33 Illizi
    "illizi": "Illizi",
    # 34 Bordj Bou Arreridj
    "bordj bou arreridj": "Bordj Bou Arreridj", "bordj bou arréridj": "Bordj Bou Arreridj",
    "bordj bou arreridj": "Bordj Bou Arreridj", "bba": "Bordj Bou Arreridj",
    # 35 Boumerdes
    "boumerdes": "Boumerdes", "boumerdès": "Boumerdes", "boumerdas": "Boumerdes",
    # 36 El Tarf
    "el tarf": "El Tarf", "el-tarf": "El Tarf",
    # 37 Tindouf
    "tindouf": "Tindouf",
    # 38 Tissemsilt
    "tissemsilt": "Tissemsilt",
    # 39 El Oued
    "el oued": "El Oued", "el-oued": "El Oued", "souf": "El Oued",
    # 40 Khenchela
    "khenchela": "Khenchela",
    # 41 Souk Ahras
    "souk ahras": "Souk Ahras", "souk-ahras": "Souk Ahras",
    # 42 Tipaza
    "tipaza": "Tipaza",
    # 43 Mila
    "mila": "Mila",
    # 44 Ain Defla
    "ain defla": "Ain Defla", "aïn defla": "Ain Defla", "ain-defla": "Ain Defla",
    # 45 Naama
    "naama": "Naama", "naâma": "Naama",
    # 46 Ain Temouchent
    "ain temouchent": "Ain Temouchent", "aïn témouchent": "Ain Temouchent",
    "ain-temouchent": "Ain Temouchent", "aïn temouchent": "Ain Temouchent",
    # 47 Ghardaia
    "ghardaia": "Ghardaia", "ghardaïa": "Ghardaia", "ghardaya": "Ghardaia",
    # 48 Relizane
    "relizane": "Relizane",
    # 49 Timimoun
    "timimoun": "Timimoun",
    # 50 Bordj Badji Mokhtar
    "bordj badji mokhtar": "Bordj Badji Mokhtar",
    # 51 Ouled Djellal
    "ouled djellal": "Ouled Djellal",
    # 52 Beni Abbes
    "beni abbes": "Beni Abbes", "béni abbès": "Beni Abbes", "beni-abbes": "Beni Abbes",
    # 53 In Salah
    "in salah": "In Salah", "in-salah": "In Salah",
    # 54 In Guezzam
    "in guezzam": "In Guezzam", "in-guezzam": "In Guezzam",
    # 55 Touggourt
    "touggourt": "Touggourt", "tugurt": "Touggourt",
    # 56 Djanet
    "djanet": "Djanet",
    # 57 El M'Ghair
    "el m'ghair": "El M Ghair", "el mghair": "El M Ghair", "el-mghair": "El M Ghair",
    # 58 El Meniaa
    "el meniaa": "El Meniaa", "el-meniaa": "El Meniaa",
}


def _strip_accents(s):
    """Remove diacritical marks (accents) from a string for fuzzy matching."""
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )


def normalize_wilaya(raw):
    """
    Normalize a wilaya string to the exact city name expected by Mylerz Algeria.
    Accepts formats:
      - "Blida", "Béjaïa", "Tizi Ouzou" (name with or without accents)
      - "09 - Blida" or "9" (number or number-name format)
    Returns the Mylerz-compatible city name. Falls back to 'Alger' only if truly unmappable.
    """
    if not raw:
        return 'Alger'

    import re
    raw = str(raw).strip()

    # Format "N - Name" or "N-Name"
    m = re.match(r'^(\d+)\s*[-–]\s*(.+)$', raw)
    if m:
        num = int(m.group(1))
        if 1 <= num <= len(WILAYA_LIST):
            return WILAYA_LIST[num - 1]
        raw = m.group(2).strip()

    # Pure number "9" or "09"
    if re.match(r'^\d+$', raw):
        num = int(raw)
        if 1 <= num <= len(WILAYA_LIST):
            return WILAYA_LIST[num - 1]

    key = raw.lower().strip()

    # 1. Alias lookup (exact lowercase match — handles all accented forms)
    if key in _WILAYA_ALIASES:
        return _WILAYA_ALIASES[key]

    # 2. Accent-stripped alias lookup (handles unexpected accent variants)
    key_stripped = _strip_accents(key)
    for alias_key, city in _WILAYA_ALIASES.items():
        if _strip_accents(alias_key) == key_stripped:
            return city

    # 3. Exact match against WILAYA_LIST (case-insensitive)
    for w in WILAYA_LIST:
        if w.lower() == key:
            return w

    # 4. Accent-stripped match against WILAYA_LIST
    for w in WILAYA_LIST:
        if _strip_accents(w.lower()) == key_stripped:
            return w

    # 5. Startswith match — use at least 5 chars to avoid false positives
    # (e.g. "Ain Defla" and "Ain Temouchent" both start with "ain " over 4 chars)
    prefix_len = max(5, min(len(key_stripped), 7))
    if len(key_stripped) >= prefix_len:
        for w in WILAYA_LIST:
            if _strip_accents(w.lower()).startswith(key_stripped[:prefix_len]):
                return w

    # 6. Commune -> Wilaya lookup: if raw is a commune name, find its parent wilaya
    #    Fixes bug: order.wilaya accidentally set to commune name instead of wilaya name
    try:
        import json as _json, os as _os
        _base = _os.path.dirname(_os.path.abspath(__file__))
        _communes_path = _os.path.join(_base, '..', 'frontend', 'public', 'communes.json')
        _wilayas_path  = _os.path.join(_base, '..', 'frontend', 'public', 'wilayas.json')
        with open(_communes_path, encoding='utf-8-sig') as _fp:
            _communes = _json.load(_fp)
        with open(_wilayas_path, encoding='utf-8-sig') as _fp:
            _wilayas = _json.load(_fp)
        _wid_map = {str(w['id']): w['name'] for w in _wilayas}
        for _commune in _communes:
            if _strip_accents(_commune.get('name', '').lower()) == key_stripped:
                _wname = _wid_map.get(str(_commune.get('wilaya_id', '')))
                if _wname and _wname in WILAYA_LIST:
                    logger.warning(f"normalize_wilaya: '{raw}' is a commune - mapped to wilaya '{_wname}'" )
                    return _wname
    except Exception as _lookup_err:
        logger.debug(f'normalize_wilaya: commune lookup failed: {_lookup_err}')

    logger.warning(f"normalize_wilaya: could not map '{raw}' — using as-is (len={len(raw)})")
    # Do NOT fall back to 'Alger' for non-empty strings — return as-is so Mylerz
    # can attempt to match it, rather than silently mapping everything to Alger.
    return raw if raw else 'Alger'



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
    mobile_no = str(mobile_no or '')
    mobile_no = re.sub(r'\D', '', mobile_no) # Remove everything that is not a digit
    if mobile_no.startswith('213'):
        mobile_no = '0' + mobile_no[3:]
    elif mobile_no.startswith('00213'):
        mobile_no = '0' + mobile_no[5:]
        
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
    # City        = wilaya normalisée TOUJOURS (Mylerz reconnaît uniquement les noms de wilaya)
    # Neighborhood = commune saisie par le client si elle existe, sinon vide
    # NE PAS utiliser la commune comme City — Mylerz ne la reconnaît pas et affiche "Alger city"
    raw_wilaya = (order.wilaya or '').strip()
    wilaya_normalized = normalize_wilaya(raw_wilaya)
    commune = (order.city or '').strip()

    # SAFETY CHECK: if the normalized wilaya is the commune (shouldn't happen but guard anyway)
    # Always ensure City = a real wilaya name from WILAYA_LIST
    if wilaya_normalized not in WILAYA_LIST:
        logger.warning(
            f"Mylerz order #{order.id}: wilaya '{raw_wilaya}' normalized to '{wilaya_normalized}' "
            f"which is NOT in WILAYA_LIST — forcing lookup"
        )
        # Try to find any WILAYA_LIST entry that contains the key
        key_s = _strip_accents(wilaya_normalized.lower())
        for w in WILAYA_LIST:
            if key_s in _strip_accents(w.lower()) or _strip_accents(w.lower()) in key_s:
                wilaya_normalized = w
                break

    # Map wilaya name → Mylerz City Code for correct hub routing
    # Using zone names causes all non-Alger orders to route through ALG (Alger)
    # Using city codes routes to the correct regional hub (CLF, LGH, etc.)
    city_code = MYLERZ_CITY_CODES.get(wilaya_normalized, wilaya_normalized)
    city = city_code                              # Mylerz City Code → correct hub
    neighborhood = commune if commune else ''     # ex: "Benacer Ben Chohra"
    district_val = wilaya_normalized
    # Street = full address so the livreur sees it clearly
    if commune and wilaya_normalized:
        street = f"{wilaya_normalized} - {commune}"
    elif order.shipping_address:
        street = order.shipping_address
    else:
        street = wilaya_normalized or commune or ''

    logger.info(
        f"Mylerz order #{order.id}: raw_wilaya={raw_wilaya!r} → city={city!r}, "
        f"commune={commune!r} → neighborhood={neighborhood!r}"
    )

    # Mylerz Algeria Address_Category is H or C or B
    address_category = 'H'

    import datetime
    now = datetime.datetime.now()
    pickup_date = (now + datetime.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%S')
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
            "Package_Serial": str(order.id),
            "Description": str(items_summary[:200]),
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
            "District": district_val,
            "Address_Category": address_category,
            "Special_Notes": f"Wilaya: {wilaya_normalized} | Commune: {neighborhood} | {getattr(order, 'notes', '') or ''}".strip(' |'),
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
        return {'success': False, 'barcode': None, 'pickup_code': None, 'message': "MYLERZ_WAREHOUSE_NAME n'est pas configuré dans les Paramètres Admin ou .env", 'raw': None}
    
    payload[0]["WarehouseName"] = str(warehouse)
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
    Get live tracking data for a given barcode from Mylerz Algeria.

    Real API response format (verified):
    {
      "Value": [{
        "Barcode": "...",
        "RefNumber": "...",
        "TrackLog": [
          { "StatusEnName": "Data Uploaded", "StatusArName": "...", "ChangedDate": "2026-..." },
          { "StatusEnName": "Ready For Pickup", ... },
          { "StatusEnName": "Received at Destination HUB", ... }
          // Most recent = LAST item
        ]
      }],
      "IsErrorState": false,
      "ErrorDescription": null
    }
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

        # ── Detect success: real API uses IsErrorState, not IsSuccess ──────
        is_error = data.get('IsErrorState', False) or data.get('isErrorState', False)
        # Also accept old format with IsSuccess for backward compat
        has_old_success = data.get('IsSuccess') or data.get('isSuccess')

        if is_error and not has_old_success:
            msg = data.get('ErrorDescription') or data.get('Message') or data.get('message') or 'Erreur de suivi Mylerz.'
            return {'success': False, 'tracking': [], 'message': msg, 'raw': data}

        # ── Parse Value[] format (real Mylerz Algeria API) ─────────────────
        value_list = data.get('Value') or []
        if value_list and isinstance(value_list, list):
            pkg = value_list[0]
            track_log = pkg.get('TrackLog') or []

            # ── Translation: API StatusEnName → Mylerz Portal display name ──
            # The API returns technical names; the Mylerz portal shows different labels.
            # Mapping verified by comparing API responses with portal screenshots.
            API_TO_PORTAL = {
                'Data Uploaded':                    'Ready in Pickup',
                'Ready For Pickup':                 'Ready in Picking',
                'In Transit to Destination HUB':    'Received in Hub in Shuttling',
                'Received at Destination HUB':      'Ready in Forward delivery',
                'Out for Delivery':                 'Out For Delivery',
                'Out For Delivery':                 'Out For Delivery',
                'Delivered':                        'Delivered in Forward delivery',
                'Delivery Failed':                  'Failed Delivery Attempt',
                'Returned to Sender':               'Return to Shipper',
                'Cancelled':                        'Cancelled',
            }

            # Normalize events, most recent LAST → reverse for [0]=latest
            normalized = []
            for ev in reversed(track_log):  # reverse: most recent first
                raw_status = ev.get('StatusEnName') or ev.get('StatusArName') or ''
                portal_status = API_TO_PORTAL.get(raw_status, raw_status)  # use portal name if known
                normalized.append({
                    'Status':      portal_status,
                    'StatusRaw':   raw_status,
                    'StatusAr':    ev.get('StatusArName') or '',
                    'Date':        ev.get('ChangedDate') or ev.get('date') or '',
                    'Description': portal_status,
                    'Location':    '',
                })
            return {'success': True, 'tracking': normalized, 'raw': data}

        # ── Fallback: old IsSuccess / Data[] format ────────────────────────
        if has_old_success:
            result_list = data.get('Data') or data.get('data') or []
            return {'success': True, 'tracking': result_list, 'raw': data}

        # Nothing matched
        msg = data.get('Message') or data.get('message') or data.get('ErrorDescription') or 'Erreur de suivi.'
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
