"""
Management command : fix_broken_thumbnails
------------------------------------------
Détecte les produits dont le fichier thumbnail n'existe plus sur le disque
et remet le champ thumbnail à NULL en base de données.

Usage :
    python manage.py fix_broken_thumbnails           # Mode simulation (dry-run)
    python manage.py fix_broken_thumbnails --fix     # Applique les corrections
    python manage.py fix_broken_thumbnails --fix --verbose
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from pioveapp.models import Product


class Command(BaseCommand):
    help = "Détecte et nettoie les thumbnails de produits dont le fichier est manquant sur le serveur."

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Applique la correction (sans --fix : mode simulation uniquement)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Affiche tous les produits vérifiés, pas seulement les cassés',
        )

    def handle(self, *args, **options):
        apply_fix = options['fix']
        verbose   = options['verbose']

        products = Product.objects.exclude(thumbnail='').exclude(thumbnail__isnull=True)
        total    = products.count()
        broken   = []

        self.stdout.write(f"\n[SCAN] Verification de {total} produits avec thumbnail...\n")

        for product in products:
            # Chemin physique du fichier sur le serveur
            file_path = os.path.join(settings.MEDIA_ROOT, str(product.thumbnail))

            if not os.path.isfile(file_path):
                broken.append(product)
                self.stdout.write(
                    self.style.ERROR(
                        f"  [BROKEN] [{product.id}] {product.name}\n"
                        f"           Fichier manquant : {file_path}"
                    )
                )
            elif verbose:
                self.stdout.write(
                    self.style.SUCCESS(f"  [OK]     [{product.id}] {product.name}")
                )

        self.stdout.write(f"\n[RESULTAT] {len(broken)} thumbnail(s) casse(s) sur {total} produits.\n")

        if not broken:
            self.stdout.write(self.style.SUCCESS("Aucune correction necessaire."))
            return

        if not apply_fix:
            self.stdout.write(
                self.style.WARNING(
                    "Mode simulation -- aucune modification effectuee.\n"
                    "Relancez avec  --fix  pour appliquer la correction."
                )
            )
            return

        # Appliquer la correction
        ids = [p.id for p in broken]
        updated = Product.objects.filter(id__in=ids).update(thumbnail=None)
        self.stdout.write(
            self.style.SUCCESS(
                f"\n[FIXE] {updated} thumbnail(s) remis a NULL en base de donnees.\n"
                f"Ces produits resteront visibles avec le placeholder image."
            )
        )
