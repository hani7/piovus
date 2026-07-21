import logging
logger = logging.getLogger(__name__)

from ._base import *
from .admin_products import ActivityLogMixin



class AdminCouponViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Coupon.objects.all().order_by('-id')
    serializer_class = CouponSerializer

class AdminActivityLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from ..models import UserActivityLog
        logs = UserActivityLog.objects.filter(user=request.user).order_by('-created_at')[:50]
        data = [{
            'id': l.id,
            'user_name': l.user.username,
            'action': l.action,
            'ip_address': l.ip_address,
            'user_agent': l.user_agent,
            'created_at': l.created_at
        } for l in logs]
        return Response(data)

class DeliveryCompanyViewSet(viewsets.ModelViewSet):
    queryset = DeliveryCompany.objects.all().order_by('name')
    serializer_class = DeliveryCompanySerializer
    pagination_class = None
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Ajout d'un transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Modification du transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_destroy(self, instance):
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Suppression du transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        instance.delete()


class DeliveryRateViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = DeliveryRate.objects.all().select_related('company')
    serializer_class = DeliveryRateSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['company', 'wilaya_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'phone', 'email']
    filterset_fields = ['is_blacklisted', 'is_b2b']

    def get_queryset(self):
        from decimal import Decimal
        from django.db.models import Count, Sum, DecimalField, Q, Max
        from django.db.models.functions import Coalesce
        from django.utils import timezone
        from datetime import timedelta

        qs = Customer.objects.annotate(
            total_orders=Count('orders'),
            total_spent=Coalesce(Sum('orders__total'), Decimal('0.00'), output_field=DecimalField()),
            last_order_date=Max('orders__created_at'),
            cancelled_orders=Count('orders', filter=Q(orders__status='cancelled'))
        )

        segment = self.request.query_params.get('segment')
        if segment == 'high_spenders':
            qs = qs.filter(total_spent__gte=50000)
        elif segment == 'frequent_returners':
            qs = qs.filter(cancelled_orders__gte=3)
        elif segment == 'inactive_30d':
            thirty_days_ago = timezone.now() - timedelta(days=30)
            qs = qs.filter(Q(last_order_date__lt=thirty_days_ago) | Q(last_order_date__isnull=True))
        elif segment == 'blacklisted':
            qs = qs.filter(is_blacklisted=True)

        return qs.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def customer_profile_details(self, request, pk=None):
        customer = self.get_object()
        orders = customer.orders.all().order_by('-created_at')
        
        # Extract unique addresses from orders
        addresses = set()
        for o in orders:
            if o.shipping_address:
                address_str = f"{o.shipping_address}, {o.wilaya}"
                addresses.add(address_str)

        from ..serializers import AdminOrderSerializer
        orders_data = AdminOrderSerializer(orders, many=True).data

        return Response({
            'ltv': customer.total_spent,
            'total_orders': customer.total_orders,
            'saved_addresses': list(addresses),
            'order_history': orders_data
        })

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = Customer.objects.filter(id__in=ids).delete()
        return Response({'deleted': deleted})

    @action(detail=True, methods=['delete'])
    def delete_customer(self, request, pk=None):
        customer = self.get_object()
        customer.delete()
        return Response({'status': 'deleted'})


class AdminNewsletterSendView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from ..models import NewsletterHistory
        history = NewsletterHistory.objects.all()[:100]  # Last 100
        data = [{'id': h.id, 'subject': h.subject, 'sent_count': h.sent_count, 'created_at': h.created_at.isoformat()} for h in history]
        return Response(data)

    def post(self, request):
        subject = request.data.get('subject')
        message_html = request.data.get('message')
        
        if not subject or not message_html:
            return Response({'error': 'Le sujet et le message sont requis.'}, status=status.HTTP_400_BAD_REQUEST)
            
        customers = Customer.objects.exclude(email='').exclude(email__isnull=True)
        emails = list(set([c.email for c in customers if c.email and '@' in c.email]))
        
        if not emails:
            return Response({'error': 'Aucun client avec une adresse email valide trouvé.'}, status=status.HTTP_400_BAD_REQUEST)

        attachment = request.FILES.get('attachment')
        attachment_name, attachment_content, attachment_mimetype = None, None, None
        if attachment:
            attachment_name = attachment.name
            attachment_content = attachment.read()
            attachment_mimetype = attachment.content_type

        def send_newsletter(subject, html_content, recipient_list, att_name=None, att_content=None, att_mime=None):
            try:
                from django.template.loader import render_to_string
                rendered_html = render_to_string('emails/newsletter.html', {'message': html_content})
                
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body="Veuillez utiliser un client email compatible HTML pour lire ce message.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    bcc=recipient_list
                )
                msg.attach_alternative(rendered_html, "text/html")
                
                if att_name and att_content and att_mime:
                    msg.attach(att_name, att_content, att_mime)
                    
                msg.send(fail_silently=True)
            except Exception as e:
                logger.warning('%s: %s', __name__, e)
                
        threading.Thread(target=send_newsletter, args=(subject, message_html, emails, attachment_name, attachment_content, attachment_mimetype)).start()
        
        from ..models import NewsletterHistory
        NewsletterHistory.objects.create(subject=subject, message=message_html, sent_count=len(emails))

        return Response({'message': f'Newsletter envoyée à {len(emails)} clients avec succès.'})


class AdminNewsletterUploadImageView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Aucune image fournie.'}, status=status.HTTP_400_BAD_REQUEST)
            
        import uuid
        from django.core.files.storage import default_storage
        ext = image.name.split('.')[-1]
        filename = f"newsletter/{uuid.uuid4().hex}.{ext}"
        saved_path = default_storage.save(filename, image)
        
        url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
        return Response({'url': url})

