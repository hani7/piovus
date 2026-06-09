import os
import django
import sys
import logging

sys.path.append(r'c:\Users\PC\Documents\piove')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from pioveapp.mylerz_service import _auth_headers, MYLERZ_BASE_URL, MYLERZ_WAREHOUSE
import requests
import json

payload = [
    {
        "Package_Serial": "TEST1234",
        "Description": "Test commande",
        "Total_Weight": 0.5,
        "Service_Type": "Delivery",
        "Service": "Standard",
        "Service_Category": "Normal",
        "Payment_Type": "Cash",
        "COD_Value": "5000",
        "Customer_Name": "Test Client",
        "Customer_Email": "test@test.com",
        "Mobile_No": "0555555555",
        "Street": "Rue test",
        "City": "Alger",
        "Neighborhood": "Alger Centre",
        "District": "Alger Centre",
        "Address_Category": "Home",
        "Special_Notes": "",
        "Reference": "TEST1234",
        "WarehouseName": MYLERZ_WAREHOUSE,
        "AllowToOpenPackage": True,
        "ValueOfGoods": 5000.0,
        "Country": "DZ"
    }
]

print("Sending payload:")
print(json.dumps(payload, indent=2))
print("---")

resp = requests.post(
    f"{MYLERZ_BASE_URL}/api/Orders/AddOrders",
    json=payload,
    headers=_auth_headers(),
)

print("Status:", resp.status_code)
print("Response text:", resp.text)
