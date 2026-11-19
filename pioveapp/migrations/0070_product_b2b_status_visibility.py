from django.db import migrations, models


def copy_retail_statuses(apps, schema_editor):
    Product = apps.get_model('pioveapp', 'Product')
    for product in Product.objects.all().iterator():
        product.is_b2b_active = product.is_active
        product.is_b2b_featured = product.is_featured
        product.is_b2b_new = product.is_new
        product.is_b2b_bestseller = product.is_bestseller
        product.is_b2b_promotion = product.is_promotion
        product.save(update_fields=[
            'is_b2b_active', 'is_b2b_featured', 'is_b2b_new',
            'is_b2b_bestseller', 'is_b2b_promotion',
        ])


class Migration(migrations.Migration):
    dependencies = [
        ('pioveapp', '0069_add_b2b_order_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_b2b_featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='is_b2b_new',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='is_b2b_bestseller',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='is_b2b_promotion',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='is_b2b_active',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(copy_retail_statuses, migrations.RunPython.noop),
    ]
