"""
Management command : fix_boutique_order_totals
-----------------------------------------------
Corrige les commandes de statut 'boutique' qui ont encore des frais
de livraison en base (avant la mise à jour automatique du transfert).

Usage :
    python manage.py fix_boutique_order_totals          # Simulation
    python manage.py fix_boutique_order_totals --fix    # Applique la correction
"""

from django.core.management.base import BaseCommand
from pioveapp.models import Order
from decimal import Decimal


class Command(BaseCommand):
    help = "Corrige les totaux des commandes boutique en supprimant les frais de livraison."

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Applique la correction (sans --fix : mode simulation uniquement)',
        )

    def handle(self, *args, **options):
        apply_fix = options['fix']

        boutique_orders = Order.objects.filter(
            status='boutique',
            delivery_cost__gt=0,
            is_deleted=False
        ).prefetch_related('items')

        count = boutique_orders.count()
        self.stdout.write(f"\n[SCAN] {count} commande(s) boutique avec frais de livraison > 0\n")

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Aucune correction necessaire."))
            return

        for order in boutique_orders:
            items_subtotal = sum(item.subtotal for item in order.items.all())
            discount = order.discount_amount or Decimal('0')
            new_total = max(Decimal('0'), items_subtotal - discount)

            self.stdout.write(
                f"  Cmd #{order.id} | "
                f"delivery={order.delivery_cost} DA | "
                f"total actuel={order.total} DA | "
                f"nouveau total={new_total} DA"
            )

        if not apply_fix:
            self.stdout.write(
                self.style.WARNING(
                    "\nMode simulation -- aucune modification.\n"
                    "Relancez avec --fix pour appliquer."
                )
            )
            return

        # Appliquer la correction
        corrected = 0
        for order in boutique_orders:
            order.delivery_cost = Decimal('0')
            order.save(update_fields=['delivery_cost'])
            order.recalculate_total()
            corrected += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n[OK] {corrected} commande(s) corrigee(s) : "
                f"delivery_cost remis a 0, totaux recalcules."
            )
        )
