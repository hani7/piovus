"""
Management command: auto_cancel_stale_orders
--------------------------------------------
Annule automatiquement toutes les commandes qui restent en état "pending"
depuis plus de N jours (défaut: 7) et qui n'ont pas été expédiées via Mylerz.

Usage:
    python manage.py auto_cancel_stale_orders
    python manage.py auto_cancel_stale_orders --days 5
    python manage.py auto_cancel_stale_orders --dry-run

Cron cPanel (tous les jours à 02:00):
    0 2 * * * /home/<user>/virtualenv/<app>/bin/python /home/<user>/<app>/manage.py auto_cancel_stale_orders >> /home/<user>/logs/auto_cancel.log 2>&1
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Annule automatiquement les commandes en attente depuis trop longtemps sans expédition.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Nombre de jours avant annulation automatique (défaut: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation uniquement — aucune modification en base',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=days)

        self.stdout.write(f"\n{'[DRY-RUN] ' if dry_run else ''}Auto-cancel commandes > {days} jours")
        self.stdout.write(f"Date de coupure : {cutoff.strftime('%Y-%m-%d %H:%M')} UTC\n")

        from pioveapp.models import Order, OrderStatusHistory

        # Cibler les commandes :
        # - statut "pending" (en attente)
        # - créées il y a plus de N jours
        # - aucun barcode Mylerz (non expédiées)
        # - pas d'is_deleted si le champ existe
        qs = Order.objects.filter(
            status='pending',
            created_at__lt=cutoff,
            mylerz_barcode='',      # pas d'expédition Mylerz
        )

        # Exclure les commandes soft-deleted si le champ existe
        if hasattr(Order, 'is_deleted'):
            qs = qs.filter(is_deleted=False)

        total = qs.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS("✅ Aucune commande à annuler."))
            return

        self.stdout.write(f"Commandes éligibles : {total}\n")

        cancelled_count = 0
        errors = []

        for order in qs:
            age_days = (timezone.now() - order.created_at).days
            self.stdout.write(f"  → Commande #{order.id} | {order.guest_name or order.customer_name} | {order.wilaya} | créée il y a {age_days}j")

            if dry_run:
                continue

            try:
                # Changer le statut
                order.status = 'cancelled'
                order.save(update_fields=['status'])

                # Enregistrer dans l'historique
                OrderStatusHistory.objects.create(
                    order=order,
                    status='cancelled',
                    notes=f'Annulation automatique — commande en attente depuis {age_days} jours sans expédition.',
                )

                cancelled_count += 1
                logger.info(f'auto_cancel: order #{order.id} cancelled after {age_days} days.')

            except Exception as e:
                error_msg = f'Erreur commande #{order.id}: {e}'
                errors.append(error_msg)
                logger.error(f'auto_cancel error: {error_msg}')
                self.stderr.write(self.style.ERROR(f'  ✗ {error_msg}'))

        # Résumé
        if dry_run:
            self.stdout.write(self.style.WARNING(f"\n[DRY-RUN] {total} commande(s) auraient été annulées."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✅ {cancelled_count}/{total} commandes annulées automatiquement."))
            if errors:
                self.stdout.write(self.style.ERROR(f"⚠️  {len(errors)} erreur(s) rencontrées."))

        self.stdout.write("")
