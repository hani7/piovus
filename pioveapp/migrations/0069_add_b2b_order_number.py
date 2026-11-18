from django.db import migrations, models
from django.db.models import Q


def populate_b2b_order_numbers(apps, schema_editor):
    Order = apps.get_model('pioveapp', 'Order')
    orders = Order.objects.filter(
        Q(customer__is_b2b=True) | Q(user__profile__is_b2b=True)
    ).order_by('created_at', 'id')
    for number, order in enumerate(orders, start=1):
        order.b2b_order_number = number
        order.save(update_fields=['b2b_order_number'])


class Migration(migrations.Migration):
    dependencies = [
        ('pioveapp', '0068_alter_banner_placement'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='b2b_order_number',
            field=models.PositiveIntegerField(blank=True, null=True, unique=True),
        ),
        migrations.RunPython(populate_b2b_order_numbers, migrations.RunPython.noop),
    ]
