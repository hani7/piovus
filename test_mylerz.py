"""
Script de diagnostic Mylerz — Exécuter depuis le terminal cPanel :
  python test_mylerz.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass

django.setup()

import requests
from django.conf import settings

BASE_URL = getattr(settings, 'MYLERZ_BASE_URL', 'https://integration.algeria.mylerz.net')
USERNAME = getattr(settings, 'MYLERZ_USERNAME', '')
PASSWORD = getattr(settings, 'MYLERZ_PASSWORD', '')
WAREHOUSE = getattr(settings, 'MYLERZ_WAREHOUSE_NAME', '')

print("=" * 60)
print("MYLERZ DIAGNOSTIC")
print("=" * 60)
print(f"Base URL : {BASE_URL}")
print(f"Username : {USERNAME!r}")
print(f"Password : {'***' if PASSWORD else '(VIDE)'}")
print(f"Warehouse: {WAREHOUSE!r}")
print("-" * 60)

# Step 1: Authenticate
print("\n[1] Test d'authentification...")
try:
    resp = requests.post(
        f"{BASE_URL}/token",
        data={
            'grant_type': 'password',
            'username': USERNAME,
            'password': PASSWORD,
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=15,
    )
    print(f"    HTTP Status: {resp.status_code}")
    try:
        data = resp.json()
        if 'access_token' in data:
            token = data['access_token']
            print(f"    AUTH: OK ✓  (token: {token[:30]}...)")
        else:
            print(f"    AUTH: ECHEC — Réponse: {data}")
            token = None
    except Exception:
        print(f"    AUTH: ECHEC — Body brut: {resp.text[:500]}")
        token = None
except Exception as e:
    print(f"    AUTH: EXCEPTION — {e}")
    token = None

if not token:
    print("\n❌ Impossible de tester l'envoi sans token.")
    sys.exit(1)

# Step 2: Test AddOrders with minimal fake payload
print("\n[2] Test AddOrders (payload minimal)...")
import datetime, json
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}
payload = [
    {
        "PickupDueDate": (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat(),
        "Package_Serial": "TEST-DIAGNOSTIC-001",
        "Description": "Test diagnostic",
        "Total_Weight": 0.5,
        "Service_Type": "DTD",
        "Service": "ND",
        "Service_Category": "Delivery",
        "Payment_Type": "COD",
        "COD_Value": 1000.0,
        "Pieces": [{"pieceNo": 1, "Weight": 0.5}],
        "Customer_Name": "Test Client",
        "Customer_Email": "test@test.com",
        "Mobile_No": "0770000000",
        "Street": "Rue test",
        "City": "Alger",
        "Neighborhood": "Alger",
        "District": "Alger",
        "Address_Category": "H",
        "Special_Notes": "",
        "Reference": "TEST-001",
        "WarehouseName": WAREHOUSE,
        "AllowToOpenPackage": True,
        "ValueOfGoods": 1000.0,
        "Country": "DZ",
    }
]

try:
    resp2 = requests.post(
        f"{BASE_URL}/api/Orders/AddOrders",
        json=payload,
        headers=headers,
        timeout=20,
    )
    print(f"    HTTP Status: {resp2.status_code}")
    try:
        data2 = resp2.json()
        print(f"    Réponse JSON: {json.dumps(data2, indent=2, ensure_ascii=False)}")
    except Exception:
        print(f"    Body brut: {resp2.text[:1000]}")
except Exception as e:
    print(f"    EXCEPTION: {e}")

print("\n" + "=" * 60)
