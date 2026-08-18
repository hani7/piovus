"""
Commande de correction des commandes Yassir Cash mal enregistrées.

Usage :
  # Afficher les commandes concernées (dry-run, sans modifier)
  python manage.py fix_yassir_orders --dry-run

  # Corriger une commande spécifique
  python manage.py fix_yassir_orders --order-id 2839

  # Corriger toutes les commandes qui ont un yassir_payment_id mais payment_method='cash'
  python manage.py fix_yassir_orders --all
"""

from django.core.management.base import BaseCommand
from pioveapp.models import Order


class Command(BaseCommand):
    help = 'Corrige les commandes Yassir Cash mal enregistrées (payment_method=cash → yassir)'

    def add_arguments(self, parser):
        parser.add_argument('--order-id', type=int, help='ID d\'une commande spécifique à corriger')
        parser.add_argument('--all', action='store_true', help='Corriger toutes les commandes avec yassir_payment_id mais payment_method=cash')
        parser.add_argument('--dry-run', action='store_true', help='Afficher sans modifier')

    def handle(self, *args, **options):
        dry = options['dry_run']

        if options['order_id']:
            try:
                order = Order.objects.get(pk=options['order_id'])
                self._fix(order, dry)
            except Order.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Commande #{options["order_id"]} introuvable.'))

        elif options['all']:
            # Commandes avec un yassir_payment_id mais toujours enregistrées comme cash
            orders = Order.objects.filter(
                yassir_payment_id__isnull=False
            ).exclude(
                yassir_payment_id=''
            ).exclude(
                payment_method='yassir'
            )
            if not orders.exists():
                self.stdout.write(self.style.SUCCESS('Aucune commande à corriger.'))
                return
            for order in orders:
                self._fix(order, dry)

        else:
            # Sans argument : juste lister l'état Yassir
            self.stdout.write('\n── Commandes avec paiement Yassir ──────────────────')
            orders = Order.objects.filter(payment_method='yassir').order_by('-created_at')[:20]
            if not orders:
                self.stdout.write('  Aucune commande Yassir trouvée.')
            for o in orders:
                self.stdout.write(
                    f'  #{o.id} | {o.guest_name} | {o.yassir_status or "N/A"} | '
                    f'payment_status={o.payment_status} | total={o.total} DA'
                )
            self.stdout.write('')

    def _fix(self, order, dry):
        old = order.payment_method
        label = f'#{order.id} ({order.guest_name}) — {old} → yassir'
        if dry:
            self.stdout.write(self.style.WARNING(f'[DRY-RUN] {label}'))
            return
        order.payment_method = 'yassir'
        if order.payment_status == 'unpaid' and order.yassir_status in ('', None):
            order.yassir_status = 'INITIALIZED'
        order.save(update_fields=['payment_method', 'yassir_status'])
        self.stdout.write(self.style.SUCCESS(f'✅ Corrigé : {label}'))
