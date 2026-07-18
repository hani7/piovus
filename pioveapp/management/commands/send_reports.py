from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count, F
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from pioveapp.models import Order, OrderItem
import datetime

class Command(BaseCommand):
    help = 'Sends an automated order report (weekly or monthly) to the admin email.'

    def add_arguments(self, parser):
        parser.add_argument('--period', type=str, help='weekly or monthly', default='weekly')

    def handle(self, *args, **options):
        period = options['period']
        now = timezone.now()
        
        if period == 'weekly':
            # Last 7 days
            start_date = now - datetime.timedelta(days=7)
            title = f"Rapport Hebdomadaire ({start_date.strftime('%d/%m/%Y')} - {now.strftime('%d/%m/%Y')})"
        elif period == 'monthly':
            # Last 30 days
            start_date = now - datetime.timedelta(days=30)
            title = f"Rapport Mensuel ({start_date.strftime('%d/%m/%Y')} - {now.strftime('%d/%m/%Y')})"
        else:
            self.stdout.write(self.style.ERROR('Invalid period. Use --period weekly or --period monthly.'))
            return

        # Fetch orders created in the period that are not cancelled or failed
        orders = Order.objects.filter(created_at__gte=start_date).exclude(status__in=['cancelled', 'failed'])
        
        total_orders = orders.count()
        total_revenue = orders.aggregate(total=Sum('total'))['total'] or 0
        
        # Get top selling products
        items = OrderItem.objects.filter(order__in=orders)
        top_products = items.values('product_name').annotate(
            total_sold=Sum('quantity'),
            revenue=Sum(F('price_at_purchase') * F('quantity'))
        ).order_by('-total_sold')[:5]

        # Prepare context
        context = {
            'title': title,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'top_products': top_products,
            'period': period
        }

        # Render email
        html_content = render_to_string('emails/admin_report.html', context)
        text_content = render_to_string('emails/admin_report.txt', context)

        # Send email
        admin_email = 'lbetaimi@piovecosmetics.com'
        subject = f"[Piové] {title} - Statistiques des Ventes"
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [admin_email])
        msg.attach_alternative(html_content, "text/html")
        
        try:
            msg.send(fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f"Report successfully sent to {admin_email}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to send email: {e}"))
