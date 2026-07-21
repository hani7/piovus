import logging
logger = logging.getLogger(__name__)

from ._base import *


class SiteSettingsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        from ..models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': getattr(settings, 'is_maintenance_mode', False),
            'maintenance_message': getattr(settings, 'maintenance_message', ''),
            'free_shipping_threshold': float(getattr(settings, 'free_shipping_threshold', 5000)),
            'new_account_discount_enabled': getattr(settings, 'new_account_discount_enabled', False),
            'new_account_discount_percent': float(getattr(settings, 'new_account_discount_percent', 0)),
            'meta_pixel_id': getattr(settings, 'meta_pixel_id', '') or '',
            'tiktok_pixel_id': getattr(settings, 'tiktok_pixel_id', '') or '',
        })

class AdminSiteSettingsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        from ..models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': getattr(settings, 'is_maintenance_mode', False),
            'maintenance_message': getattr(settings, 'maintenance_message', ''),
            'free_shipping_threshold': float(getattr(settings, 'free_shipping_threshold', 5000)),
            'new_account_discount_enabled': getattr(settings, 'new_account_discount_enabled', False),
            'new_account_discount_percent': float(getattr(settings, 'new_account_discount_percent', 0)),
            'meta_pixel_id': getattr(settings, 'meta_pixel_id', '') or '',
            'tiktok_pixel_id': getattr(settings, 'tiktok_pixel_id', '') or '',
        })

    def post(self, request):
        from ..models import SiteSettings
        settings = SiteSettings.load()
        
        if request.path.endswith('toggle_maintenance/'):
            settings.is_maintenance_mode = not settings.is_maintenance_mode
            settings.save()
            from ..models import UserActivityLog
            action_text = "Activé" if settings.is_maintenance_mode else "Désactivé"
            UserActivityLog.objects.create(
                user=request.user,
                action=f"{action_text} le mode maintenance",
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            return Response({'is_maintenance_mode': settings.is_maintenance_mode})

        # General settings update
        changed = False
        msg = request.data.get('maintenance_message')
        if msg is not None:
            settings.maintenance_message = msg
            changed = True

        threshold = request.data.get('free_shipping_threshold')
        if threshold is not None:
            settings.free_shipping_threshold = threshold
            changed = True

        discount_enabled = request.data.get('new_account_discount_enabled')
        if discount_enabled is not None:
            settings.new_account_discount_enabled = bool(discount_enabled)
            changed = True

        discount_percent = request.data.get('new_account_discount_percent')
        if discount_percent is not None:
            settings.new_account_discount_percent = discount_percent
            changed = True

        pixel_id = request.data.get('meta_pixel_id')
        if pixel_id is not None:
            settings.meta_pixel_id = pixel_id.strip()
            changed = True

        tiktok_id = request.data.get('tiktok_pixel_id')
        if tiktok_id is not None:
            settings.tiktok_pixel_id = tiktok_id.strip()
            changed = True

        if changed:
            settings.save()
            return Response({'message': 'Paramètres mis à jour.'})

        return Response({'error': 'Requête invalide.'}, status=400)


class AdminB2BRequestViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(profile__is_b2b_pending=True).select_related('profile')

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        user = self.get_object()
        user.profile.is_b2b_pending = False
        user.profile.is_b2b = True
        user.profile.save()
        
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            action=f"Validation du compte B2B de {user.email}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        user.profile.is_b2b_pending = False
        user.profile.save()
        
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            action=f"Rejet du compte B2B de {user.email}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        return Response({'status': 'rejected'})

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def mylerz_webhook(request):
    """
    Webhook endpoint for Mylerz Algeria to push status updates.
    Expects a POST payload with Barcode and Status.
    """
    data = request.data
    # Handling both single object or list of objects
    if isinstance(data, dict):
        events = [data]
    elif isinstance(data, list):
        events = data
    else:
        return Response({'error': 'Invalid payload format'}, status=400)

    from pioveapp.management.commands.sync_mylerz import send_status_email
    
    updated = 0
    for event in events:
        barcode = event.get('Barcode') or event.get('barcode') or event.get('Package_Serial')
        status_text = event.get('Status') or event.get('status')
        
        if not barcode or not status_text:
            continue
            
        try:
            order = Order.objects.filter(mylerz_barcode=barcode).first()
            if not order and str(barcode).isdigit():
                order = Order.objects.filter(id=barcode).first()
                
            if order and order.mylerz_status != status_text:
                order.mylerz_status = status_text
                order.save(update_fields=['mylerz_status'])
                
                m_status_lower = status_text.lower()
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
                    order.status = new_piove_status
                    order.save(update_fields=['status'])
                    
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=new_piove_status,
                        notes=f"Statut Mylerz mis à jour via Webhook : {status_text}"
                    )
                    
                    send_status_email(order, new_piove_status, order.mylerz_barcode)
                    updated += 1
        except Exception as e:
            logger.warning('%s: %s', __name__, e)

    return Response({'success': True, 'updated': updated})


# ─── Médiathèque — scan du dossier media/ ─────────────────────────────────────
import os, mimetypes
from django.core.files.storage import default_storage

class AdminMediaView(APIView):
    """
    GET  /api/admin/media/  → liste tous les fichiers dans MEDIA_ROOT
    POST /api/admin/media/  → upload un nouveau fichier
    DELETE /api/admin/media/?path=xxx → supprime un fichier
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'}
    VIDEO_EXTS = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}

    def get(self, request):
        media_root = settings.MEDIA_ROOT
        media_url  = settings.MEDIA_URL
        api_base = request.build_absolute_uri('/')[:-1]
        results = []
        if os.path.exists(media_root):
            for dirpath, _, filenames in os.walk(media_root):
                for fname in sorted(filenames):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext not in self.IMAGE_EXTS and ext not in self.VIDEO_EXTS:
                        continue
                    full_path = os.path.join(dirpath, fname)
                    rel_path  = os.path.relpath(full_path, media_root).replace('\\', '/')
                    file_url  = f"{api_base}{media_url}{rel_path}"
                    try:
                        size = os.path.getsize(full_path)
                    except OSError:
                        size = 0
                    results.append({
                        'id': rel_path,
                        'name': fname,
                        'folder': os.path.dirname(rel_path) or '/',
                        'file': file_url,
                        'file_type': 'video' if ext in self.VIDEO_EXTS else 'image',
                        'size': size,
                        'rel_path': rel_path,
                    })
        results.sort(key=lambda x: x['folder'])
        return Response({'count': len(results), 'results': results})

    def post(self, request):
        """Upload a new file to media/uploads/"""
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)
        ext = os.path.splitext(uploaded.name)[1].lower()
        if ext not in self.IMAGE_EXTS and ext not in self.VIDEO_EXTS:
            return Response({'error': 'Type de fichier non supporté.'}, status=400)
        save_path = f"uploads/{uploaded.name}"
        saved = default_storage.save(save_path, uploaded)
        api_base = request.build_absolute_uri('/')[:-1]
        file_url = f"{api_base}{settings.MEDIA_URL}{saved}"
        return Response({
            'id': saved,
            'name': uploaded.name,
            'file': file_url,
            'file_type': 'video' if ext in self.VIDEO_EXTS else 'image',
        }, status=201)

    def delete(self, request):
        rel_path = request.query_params.get('path', '').strip('/')
        if not rel_path:
            return Response({'error': 'path requis'}, status=400)
        if '..' in rel_path:
            return Response({'error': 'Chemin invalide'}, status=400)
        full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        if os.path.isfile(full_path):
            os.remove(full_path)
            return Response({'deleted': rel_path})
        return Response({'error': 'Fichier introuvable'}, status=404)


# ─── SATIM Payment Callback ───────────────────────────────────────────────────
from django.http import HttpResponseRedirect
from ..satim_service import confirm_order

@api_view(['GET'])
@permission_classes([AllowAny])
def satim_callback(request):
    """Called by SATIM when the user returns from the payment page."""
    order_id_satim = request.GET.get('orderId')
    order_id_piove = request.GET.get('order_id')
    frontend_base  = getattr(settings, 'FRONTEND_URL', 'https://piovecosmetics.dz')

    def redirect_to(status, reason=None, msg=None):
        from urllib.parse import urlencode
        p = {'status': status}
        if order_id_piove: p['order_id'] = order_id_piove
        if reason:         p['reason']   = reason
        if msg:            p['msg']      = msg
        return HttpResponseRedirect(f"{frontend_base}/payment-result?{urlencode(p)}")

    if not order_id_satim or not order_id_piove:
        if order_id_piove:
            try:
                o = Order.objects.get(id=order_id_piove)
                o.status = 'cancelled'
                o.save(update_fields=['status'])
            except Order.DoesNotExist:
                pass
        return redirect_to('cancelled', reason='missing_params')

    confirm_res = confirm_order(order_id_satim)

    try:
        order = Order.objects.get(id=order_id_piove)
    except Order.DoesNotExist:
        return redirect_to('fail', reason='order_not_found')

    if confirm_res.get('success'):
        if order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.save(update_fields=['payment_status', 'status'])
            OrderStatusHistory.objects.create(
                order=order,
                status='confirmed',
                notes=f"Paiement CIB/Edahabia réussi (ID transaction: {order_id_satim})."
            )
        return redirect_to('success')
    else:
        order.status = 'cancelled'
        order.save(update_fields=['status'])
        fail_msg = confirm_res.get('message', 'Paiement annulé ou échoué.')
        OrderStatusHistory.objects.create(
            order=order,
            status='cancelled',
            notes=f"Paiement CIB/Edahabia annulé : {fail_msg}"
        )
        return redirect_to('cancelled', reason='payment_failed', msg=fail_msg)


@api_view(['GET'])
@permission_classes([AllowAny])
def satim_test_view(request):
    """Diagnostic: test SATIM connectivity and credentials."""
    from ..satim_service import test_satim_connection
    return Response(test_satim_connection())


class AdminProfileView(APIView):
    """GET / PUT admin user profile (first_name, last_name, email)."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        u = request.user
        return Response({
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'is_superuser': u.is_superuser,
            'groups': list(u.groups.values_list('name', flat=True)),
        })

    def put(self, request):
        u = request.user
        u.first_name = request.data.get('first_name', u.first_name)
        u.last_name  = request.data.get('last_name',  u.last_name)
        u.email      = request.data.get('email',      u.email)
        u.save()
        return Response({
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        })


class AdminChangePasswordView(APIView):
    """POST {current_password, new_password} to change password."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password', '')
        new_pwd  = request.data.get('new_password', '')

        if not user.check_password(current):
            return Response({'detail': 'Mot de passe actuel incorrect.'}, status=400)
        if len(new_pwd) < 8:
            return Response({'detail': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)

        user.set_password(new_pwd)
        user.save()
        return Response({'detail': 'Mot de passe changé avec succès.'})



class AdminOrderHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.all().select_related('user', 'customer', 'deleted_by').prefetch_related('items').order_by('-created_at')
    permission_classes = [IsAdminUser]
    serializer_class = AdminOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'payment_status', 'is_deleted', 'payment_method', 'customer__is_b2b']
    search_fields = ['guest_name', 'guest_phone', 'user__username', 'user__first_name', 'id']

