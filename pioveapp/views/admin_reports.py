from ._base import *


class AdminReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        export = request.query_params.get('export')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        group_by = request.query_params.get('group_by', 'day') # day, week, month
        status_filter = request.query_params.get('status')

        qs = Order.objects.all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.exclude(status='cancelled')

        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        if export:
            if export == 'json':
                full_orders = []
                for o in qs.order_by('-created_at'):
                    customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
                    phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
                    
                    items = []
                    for item in o.items.all():
                        items.append(f"{item.product_name} (x{item.quantity})")
                        
                    full_orders.append({
                        'ID': o.id,
                        'Date': o.created_at.strftime('%Y-%m-%d %H:%M'),
                        'Client': customer,
                        'Téléphone': phone or '',
                        'Wilaya': getattr(o, 'wilaya', ''),
                        'Commune': getattr(o, 'city', ''),
                        'Adresse': getattr(o, 'shipping_address', ''),
                        'Statut': o.get_status_display(),
                        'Sous-total': float(sum(item.subtotal for item in o.items.all())),
                        'Livraison': float(o.delivery_cost),
                        'Remise': float(o.discount_amount),
                        'Total': float(o.total),
                        'Articles': " | ".join(items)
                    })
                return Response(full_orders)

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="rapport_ventes.csv"'
            response.write(u'\ufeff'.encode('utf8')) # BOM for Excel
            writer = csv.writer(response)
            writer.writerow(['ID', 'Date', 'Client', 'Telephone', 'Wilaya', 'Statut', 'Total'])

            for o in qs.order_by('-created_at'):
                customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
                phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
                writer.writerow([
                    o.id,
                    o.created_at.strftime('%Y-%m-%d %H:%M'),
                    customer,
                    phone,
                    o.wilaya,
                    o.get_status_display(),
                    float(o.total)
                ])
            return response

        # Grouping
        if group_by == 'month':
            trunc = TruncMonth('created_at')
        elif group_by == 'week':
            trunc = TruncWeek('created_at')
        else:
            trunc = TruncDate('created_at')

        from django.db.models import Count, Sum, Q

        aggregated = (
            qs.annotate(period=trunc)
            .values('period')
            .annotate(
                revenue=Sum('total'), 
                orders_count=Count('id'),
                pending=Count('id', filter=Q(status='pending')),
                confirmed=Count('id', filter=Q(status='confirmed')),
                shipped=Count('id', filter=Q(status='shipped')),
                fulfilled=Count('id', filter=Q(status='fulfilled')),
                cancelled=Count('id', filter=Q(status='cancelled')),
                returned=Count('id', filter=Q(status='returned'))
            )
            .order_by('period')
        )

        chart_data = []
        for item in aggregated:
            if item['period']:
                chart_data.append({
                    'period': item['period'].strftime('%Y-%m-%d'),
                    'revenue': float(item['revenue'] or 0),
                    'orders_count': item['orders_count'],
                    'pending': item.get('pending', 0),
                    'confirmed': item.get('confirmed', 0),
                    'shipped': item.get('shipped', 0),
                    'fulfilled': item.get('fulfilled', 0),
                    'cancelled': item.get('cancelled', 0),
                    'returned': item.get('returned', 0),
                })

        orders_data = []
        for o in qs.order_by('-created_at')[:200]: # limit to 200 for table performance
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
            orders_data.append({
                'id': o.id,
                'date': o.created_at.strftime('%Y-%m-%d %H:%M'),
                'customer': customer,
                'wilaya': o.wilaya,
                'status': o.status,
                'status_display': o.get_status_display(),
                'total': float(o.total)
            })

        annual_year = request.query_params.get('annual_year')
        from django.utils import timezone
        if not annual_year:
            annual_year = timezone.now().year
        else:
            annual_year = int(annual_year)

        from django.db.models import Count, Sum, Q
        from django.db.models.functions import ExtractMonth

        annual_qs = Order.objects.filter(created_at__year=annual_year)
        annual_stats = annual_qs.annotate(month=ExtractMonth('created_at')).values('month').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total'),
            pending=Count('id', filter=Q(status='pending')),
            confirmed=Count('id', filter=Q(status='confirmed')),
            shipped=Count('id', filter=Q(status='shipped')),
            fulfilled=Count('id', filter=Q(status='fulfilled')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            returned=Count('id', filter=Q(status='returned'))
        )

        annual_data = []
        for i in range(1, 13):
            annual_data.append({
                'month': i,
                'total_orders': 0,
                'total_revenue': 0.0,
                'pending': 0,
                'confirmed': 0,
                'shipped': 0,
                'fulfilled': 0,
                'cancelled': 0,
                'returned': 0
            })

        for stat in annual_stats:
            m = stat['month'] - 1
            if 0 <= m < 12:
                annual_data[m]['total_orders'] = stat['total_orders']
                annual_data[m]['total_revenue'] = float(stat['total_revenue'] or 0)
                annual_data[m]['pending'] = stat['pending']
                annual_data[m]['confirmed'] = stat['confirmed']
                annual_data[m]['shipped'] = stat['shipped']
                annual_data[m]['fulfilled'] = stat['fulfilled']
                annual_data[m]['cancelled'] = stat['cancelled']
                annual_data[m]['returned'] = stat['returned']

        # Source stats (origin of orders)
        from django.db.models import Count, Sum, Q
        source_qs = Order.objects.all()
        if start_date:
            source_qs = source_qs.filter(created_at__date__gte=start_date)
        if end_date:
            source_qs = source_qs.filter(created_at__date__lte=end_date)

        source_stats_raw = (
            source_qs
            .values('source')
            .annotate(count=Count('id'), revenue=Sum('total'))
            .order_by('-count')
        )
        source_stats = []
        for s in source_stats_raw:
            label = s['source'] or 'direct'
            source_stats.append({
                'source': label,
                'count': s['count'],
                'revenue': float(s['revenue'] or 0),
            })

        return Response({
            'chart': chart_data,
            'orders': orders_data,
            'annual_summary': annual_data,
            'source_stats': source_stats,
        })

