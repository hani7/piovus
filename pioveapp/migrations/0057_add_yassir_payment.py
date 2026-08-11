from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pioveapp', '0056_add_boutique_model'),
    ]

    operations = [
        # 1. Ajouter 'yassir' comme choix de payment_method
        migrations.AlterField(
            model_name='order',
            name='payment_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('cash',   'Paiement à la livraison'),
                    ('cib',    'CIB ou Edahabia'),
                    ('yassir', 'Yassir Cash'),
                ],
                default='cash',
            ),
        ),
        # 2. Champs Yassir
        migrations.AddField(
            model_name='order',
            name='yassir_payment_id',
            field=models.CharField(
                max_length=200, blank=True, default='',
                verbose_name='Yassir Payment ID',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='yassir_client_secret',
            field=models.CharField(
                max_length=500, blank=True, default='',
                verbose_name='Yassir Client Secret',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='yassir_status',
            field=models.CharField(
                max_length=50, blank=True, default='',
                verbose_name='Statut Yassir',
            ),
        ),
    ]
