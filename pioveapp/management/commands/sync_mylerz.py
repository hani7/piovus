import time
import logging
import threading
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from pioveapp.models import Order, OrderStatusHistory
from pioveapp.mylerz_service import track_shipment

logger = logging.getLogger(__name__)

def send_status_email(order, new_status, barcode):
    email = order.guest_email or (order.user.email if order.user else None)
    if not email:
        return

    name = order.guest_name or (order.user.get_full_name() if order.user else 'Client')
    
    if new_status == 'shipped':
        subject = f"Votre commande #{order.id} est en route !"
        body = f"""
        Bonjour {name},<br><br>
        Excellente nouvelle ! Votre commande <strong>#{order.id}</strong> a été expédiée.<br>
        Elle est en cours d'acheminement avec notre partenaire Mylerz.<br><br>
        Vous pouvez suivre votre colis avec le numéro de suivi : <strong>{barcode}</strong><br><br>
        Merci pour votre confiance,<br>
        L'équipe Piové Cosmetics
        """
    elif new_status == 'fulfilled':
        subject = f"Votre commande #{order.id} a été livrée"
        body = f"""
        Bonjour {name},<br><br>
        Votre commande <strong>#{order.id}</strong> a bien été livrée !<br>
        Nous espérons que vos produits vous plairont.<br><br>
        À très bientôt sur Piové Cosmetics !
        """
    else:
        return

    def _send():
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body="Votre commande a changé de statut.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email]
            )
            msg.attach_alternative(body, "text/html")
            msg.send(fail_silently=True)
        except Exception as e:
            logger.error(f"Failed to send status email for order {order.id}: {e}")

    threading.Thread(target=_send).start()


class Command(BaseCommand):
    help = 'Synchronise le statut des commandes Mylerz avec la plateforme.'

    def handle(self, *args, **options):
        # Chercher toutes les commandes Mylerz actives (ni livrées ni annulées définitivement)
        active_orders = Order.objects.filter(mylerz_barcode__isnull=False).exclude(mylerz_barcode='').exclude(status__in=['fulfilled', 'cancelled', 'returned'])
        
        self.stdout.write(f"Trouvé {active_orders.count()} commande(s) à synchroniser.")
        
        updated = 0
        for order in active_orders:
            res = track_shipment(order.mylerz_barcode)
            if not res.get('success') or not res.get('tracking'):
                continue
                
            latest_event = res['tracking'][0]
            mylerz_status = latest_event.get('Status') or latest_event.get('status')
            
            if not mylerz_status:
                continue

            if order.mylerz_status != mylerz_status:
                order.mylerz_status = mylerz_status
                order.save(update_fields=['mylerz_status'])
                
                # Mappage vers les statuts Piové
                m_status_lower = mylerz_status.lower()
                new_piove_status = None
                
                if m_status_lower in ['out for delivery', 'shuttling', 'forward delivery', 'dispatched']:
                    new_piove_status = 'shipped'
                elif m_status_lower in ['delivered', 'received by myler']:
                    new_piove_status = 'fulfilled'
                elif m_status_lower in ['returned', 'reverse delivery', 'returned to shipper']:
                    new_piove_status = 'returned'
                elif m_status_lower in ['cancelled']:
                    new_piove_status = 'cancelled'

                if new_piove_status and order.status != new_piove_status:
                    old_status = order.status
                    order.status = new_piove_status
                    order.save(update_fields=['status'])
                    
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=new_piove_status,
                        notes=f"Statut Mylerz mis à jour : {mylerz_status}"
                    )
                    
                    send_status_email(order, new_piove_status, order.mylerz_barcode)
                    updated += 1
                    self.stdout.write(f"Commande #{order.id} passée à {new_piove_status} (Mylerz: {mylerz_status})")
            
            time.sleep(0.5) # Anti-rate limit
            
        self.stdout.write(self.style.SUCCESS(f"Synchronisation terminée. {updated} mise(s) à jour."))
