import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from pioveapp.models import Product

count = 0
for p in Product.objects.all():
    changed = False
    
    # Check if there are literal backslash-n
    if '\\n' in p.description:
        p.description = p.description.replace('\\n', '\n')
        changed = True
        
    # Check if there are user-typed /n
    if '/n' in p.description:
        p.description = p.description.replace('/n', '\n')
        changed = True

    if changed:
        p.save()
        count += 1

print(f"Cleaned descriptions for {count} products.")
