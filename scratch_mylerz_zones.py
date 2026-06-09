import os
import django
import sys

sys.path.append(r'c:\Users\PC\Documents\piove')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from pioveapp.mylerz_service import get_city_zones
import json

zones = get_city_zones()
# Just print a few to see the structure
print(json.dumps(zones[:5], indent=2))
