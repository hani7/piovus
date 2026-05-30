import csv
import re
import os
import urllib.request
import urllib.error
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from pioveapp.models import Product, ProductVariant

def download_image(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
        filename = url.split('/')[-1].split('?')[0]
        if not filename:
            filename = 'image.jpg'
        return filename, data
    except Exception:
        return None, None

class Command(BaseCommand):
    help = 'Import product variants and fix parent prices from WooCommerce CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default=r'C:\Users\PC\Downloads\wc-product-export-28-5-2026-1779955774915.csv',
        )

    def handle(self, *args, **options):
        csv_path = options['csv']

        if not os.path.exists(csv_path):
            self.stderr.write(f'File not found: {csv_path}')
            return

        self.stdout.write('Clearing existing variants...')
        ProductVariant.objects.all().delete()
        
        # 1. Map WooCommerce ID to Parent Product Name
        wc_id_to_name = {}
        color_map = {}
        import json
        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                is_parent = not row.get('Parent', '').strip()
                if is_parent:
                    wc_id = row.get('ID', '').strip()
                    name = row.get('Nom', '').strip()
                    if wc_id and name:
                        wc_id_to_name[wc_id] = name
                        swatches_str = row.get('Swatches Attributes', '').strip()
                        if swatches_str:
                            try:
                                swatches = json.loads(swatches_str)
                                for attr_key, attr_data in swatches.items():
                                    if attr_data.get('type') in ('color', 'image'):
                                        for term_key, term_data in attr_data.get('terms', {}).items():
                                            t_name = term_data.get('name', '').strip()
                                            t_color = term_data.get('color', '').strip()
                                            t_image = term_data.get('image', '').strip()
                                            
                                            if t_name:
                                                if t_color:
                                                    color_map[(name, t_name)] = t_color
                                                elif t_image:
                                                    color_map[(name, t_name)] = t_image
                            except Exception:
                                pass

        # 2. Cache database products by name
        products_by_name = {p.name.lower(): p for p in Product.objects.all()}

        variants_created = 0
        prices_updated = 0
        images_downloaded = 0

        # 3. Process variants
        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                parent_raw = row.get('Parent', '').strip()
                if not parent_raw.startswith('id:'):
                    continue
                
                parent_wc_id = parent_raw.replace('id:', '')
                parent_name = wc_id_to_name.get(parent_wc_id)
                if not parent_name:
                    continue

                parent_product = products_by_name.get(parent_name.lower())
                if not parent_product:
                    continue

                variant_full_name = row.get('Nom', '').strip()
                # Extract variant short name (e.g. "Full Coverage Foundation - FCF46 Pinky" -> "FCF46 Pinky")
                variant_name = variant_full_name
                if ' - ' in variant_name:
                    variant_name = variant_name.split(' - ', 1)[1]
                    
                # If variant_name is not in map, try matching partially
                color_hex = color_map.get((parent_name, variant_name), '')
                if not color_hex:
                    # try partial match in case WooCommerce changed the name slightly
                    for (p_name, t_name), c_val in color_map.items():
                        if p_name == parent_name and (t_name in variant_name or variant_name in t_name):
                            color_hex = c_val
                            break

                # Create variant
                stock_raw = row.get('Stock', '').strip()
                stock = int(stock_raw) if stock_raw.isdigit() else 10
                sku = row.get('UGS', '').strip()
                stock = int(stock_raw) if stock_raw.isdigit() else 10
                sku = row.get('UGS', '').strip()

                variant = ProductVariant(
                    product=parent_product,
                    name=variant_name,
                    stock=stock,
                    sku=sku,
                    color_hex=color_hex
                )

                # Fix parent price if it's 0
                price_raw = row.get('Tarif régulier', '').strip()
                if price_raw:
                    try:
                        price = float(price_raw)
                        if parent_product.price == 0:
                            parent_product.price = price
                            parent_product.save(update_fields=['price'])
                            prices_updated += 1
                            self.stdout.write(f'  [PRICE FIX] {parent_product.name} -> {price} DA')
                    except ValueError:
                        pass

                # Variant Image
                img_urls = [u.strip() for u in row.get('Images', '').split(',') if u.strip()]
                if img_urls:
                    filename, data = download_image(img_urls[0])
                    if data:
                        variant.image.save(filename, ContentFile(data), save=False)
                        images_downloaded += 1

                variant.save()
                variants_created += 1
                self.stdout.write(f'  [VARIANT] {parent_product.name} - {variant_name}')

        self.stdout.write(self.style.SUCCESS(
            f'Done! {variants_created} variants created. {prices_updated} product prices fixed. {images_downloaded} variant images downloaded.'
        ))
