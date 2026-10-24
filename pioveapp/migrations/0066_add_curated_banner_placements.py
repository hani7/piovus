from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pioveapp', '0065_orderitem_packaging'),
    ]

    operations = [
        migrations.AlterField(
            model_name='banner',
            name='placement',
            field=models.CharField(
                choices=[
                    ('hero', 'Hero Slider (Accueil)'),
                    ('popup', "Pop-up d'entrée"),
                    ('home_section_1', 'Bandeau Section 1 (Accueil)'),
                    ('home_section_2', 'Bandeau Section 2 (Accueil)'),
                    ('top_banner', 'Bandeau Supérieur (Global)'),
                    ('category_banner', 'Bannière Page Catégorie'),
                    ('side_left', 'Bannière Flottante Gauche'),
                    ('side_right', 'Bannière Flottante Droite'),
                    ('horizontal_new_banner', 'Horizontal New Banner (Accueil)'),
                    ('curated_bestseller', 'Fond Best Seller (Accueil)'),
                    ('curated_promo', 'Fond Promo (Accueil)'),
                    ('curated_special', 'Fond Offre Spéciale (Accueil)'),
                ],
                default='hero',
                max_length=50,
            ),
        ),
    ]
