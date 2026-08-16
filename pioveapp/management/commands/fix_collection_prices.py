"""
Management command : fix_collection_prices
-----------------------------------------------
Corrige les commandes existantes dont les prix d'articles de type "collection" 
ont été enregistrés au prix global du produit au lieu du prix divisé.

Usage :
    python manage.py fix_collection_prices          # Simulation
    python manage.py fix_collection_prices --fix    # Applique la correction
"""

from django.core.management.base import BaseCommand
from pioveapp.models import Order
from decimal import Decimal

class Command(BaseCommand):
    help = "Corrige le prix des articles de collection qui ont ete surfactures."

    def add_arguments(self, parser):
        parser.add_argument('--fix', action='store_true', help='Appliquer la correction')

    def handle(self, *args, **options):
        apply_fix = options['fix']
        
        # On cherche toutes les commandes actives
        orders = Order.objects.filter(is_deleted=False).prefetch_related('items', 'items__product', 'items__variant')
        
        buggy_orders = []
        
        for order in orders:
            is_buggy = False
            for item in order.items.all():
                if item.variant and item.variant.choice_group:
                    # C'est un article de collection
                    num_groups = item.product.variants.exclude(choice_group='').values('choice_group').distinct().count()
                    if num_groups > 1:
                        expected_price = float(item.product.effective_price) / num_groups
                        # Si le prix enregistré est largement supérieur (proche du prix total)
                        if float(item.price_at_purchase) > expected_price * 1.5:
                            is_buggy = True
                            break
            if is_buggy:
                buggy_orders.append(order)

        count = len(buggy_orders)
        self.stdout.write(f"\n[SCAN] {count} commande(s) avec des prix de collection erronees\n")

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Aucune correction necessaire."))
            return

        corrected = 0
        for order in buggy_orders:
            self.stdout.write(f"\nCmd #{order.id} | Total actuel: {order.total} DA")
            for item in order.items.all():
                if item.variant and item.variant.choice_group:
                    num_groups = item.product.variants.exclude(choice_group='').values('choice_group').distinct().count()
                    if num_groups > 1:
                        expected_price = float(item.product.effective_price) / num_groups
                        if float(item.price_at_purchase) > expected_price * 1.5:
                            old_price = item.price_at_purchase
                            new_price = Decimal(str(expected_price))
                            self.stdout.write(f"  - {item.product_name} ({item.variant_name}): {old_price} DA -> {new_price} DA")
                            if apply_fix:
                                item.price_at_purchase = new_price
                                item.save(update_fields=['price_at_purchase'])
            
            if apply_fix:
                order.recalculate_total()
                self.stdout.write(f"  -> Nouveau total: {order.total} DA")
                corrected += 1

        if not apply_fix:
            self.stdout.write(self.style.WARNING("\nMode simulation -- aucune modification. Relancez avec --fix pour appliquer."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n[OK] {corrected} commande(s) corrigee(s)."))
