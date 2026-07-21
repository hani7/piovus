import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

import traceback
from pioveapp.models import Order, OrderItem, UserActivityLog
from django.contrib.auth import get_user_model

order = Order.objects.prefetch_related('items').first()
print('Testing with order:', order.id)

data = {
    'guest_name': order.guest_name or 'Test',
    'guest_phone': order.guest_phone or '0500000000',
    'guest_phone2': '',
    'guest_email': order.guest_email or '',
    'shipping_address': order.shipping_address or 'Test',
    'wilaya': order.wilaya or 'Alger',
    'city': order.city or 'Alger',
    'notes': '',
    'items': [{'id': it.id, 'quantity': it.quantity} for it in order.items.all()]
}

try:
    editable_fields = ['guest_name', 'guest_phone', 'guest_phone2', 'guest_email',
                       'shipping_address', 'wilaya', 'city', 'notes']
    changed = []
    for field in editable_fields:
        if field in data:
            new_val = data[field]
            if getattr(order, field) != new_val:
                setattr(order, field, new_val)
                changed.append(field)

    items_data = data.get('items', [])
    for item_d in items_data:
        item_id = item_d.get('id')
        qty = int(item_d.get('quantity', 1))
        if not item_id:
            continue
        try:
            item = order.items.get(id=item_id)
            if qty <= 0:
                item.delete()
            else:
                item.quantity = qty
                item.save(update_fields=['quantity'])
        except Exception as e:
            print('Item update error:', e)

    if changed:
        order.save(update_fields=changed)
    print('save OK, changed:', changed)

    if items_data:
        order.recalculate_total()
    print('recalculate OK')

    user = get_user_model().objects.filter(is_staff=True).first()
    UserActivityLog.objects.create(
        user=user,
        action=f'Modification manuelle commande #{order.id}: {", ".join(changed) if changed else "items"}',
        ip_address='127.0.0.1',
        user_agent='test',
    )
    print('UAL OK')

    from pioveapp.serializers import AdminOrderSerializer as Ser
    result = Ser(order, context={}).data
    print('Serialize OK - items:', len(result.get('items', [])))
    print('SUCCESS - no 500 error locally')

except Exception as e:
    traceback.print_exc()
    print('ERROR:', e)
