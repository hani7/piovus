from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('pioveapp', '0064_customer_is_newsletter_alter_customer_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='packaging',
            field=models.CharField(
                blank=True,
                choices=[('boite', 'Boîte'), ('carton', 'Carton')],
                default='',
                max_length=10,
            ),
        ),
    ]
