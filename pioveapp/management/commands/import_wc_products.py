import csv
import re
import os
import urllib.request
import urllib.error
from io import BytesIO
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.core.files.base import ContentFile
from pioveapp.models import Category, Product, ProductImage


def strip_html(text):
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('\r\n', '\n').replace('\r', '\n')
    return text.strip()


def parse_price(val):
    if not val or val.strip() == '':
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def parse_images(images_str):
    if not images_str:
        return []
    return [u.strip() for u in images_str.split(',') if u.strip()]


def make_unique_slug(base_slug, existing_slugs):
    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    existing_slugs.add(slug)
    return slug


def download_image(url, timeout=10):
    """Download image from URL, return (filename, content_bytes) or (None, None)."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
        # Extract filename from URL
        filename = url.split('/')[-1].split('?')[0]
        if not filename:
            filename = 'image.jpg'
        return filename, data
    except (urllib.error.URLError, Exception):
        return None, None


class Command(BaseCommand):
    help = 'Import products + categories + images from WooCommerce CSV (--clear to reset)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default=r'C:\Users\PC\Downloads\wc-product-export-28-5-2026-1779955774915.csv',
        )
        parser.add_argument('--clear', action='store_true', help='Clear existing products & categories first')
        parser.add_argument('--no-images', action='store_true', help='Skip downloading images (faster)')

    def handle(self, *args, **options):
        csv_path = options['csv']
        download_imgs = not options['no_images']

        if not os.path.exists(csv_path):
            self.stderr.write(f'File not found: {csv_path}')
            return

        if options['clear']:
            self.stdout.write('Clearing products and categories...')
            Product.objects.all().delete()
            Category.objects.all().delete()
            self.stdout.write('Cleared.')

        # Slug tracking
        existing_product_slugs = set(Product.objects.values_list('slug', flat=True))
        existing_cat_slugs = set(Category.objects.values_list('slug', flat=True))

        # Category cache: slug -> Category instance
        cat_cache = {c.slug: c for c in Category.objects.all()}

        # Category display order mapping (hand-curated)
        CAT_ORDER = {
            'face': 0, 'lips': 1, 'eyes': 2, 'nails': 3,
            'skin-body-care': 4, 'accessoires': 5,
        }

        products_created = 0
        cats_created = 0
        images_downloaded = 0

        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            for row in reader:
                # Skip variant rows
                if row.get('Parent', '').strip():
                    continue

                # Only published
                if row.get('Publié', '').strip() != '1':
                    continue

                name = row.get('Nom', '').strip()
                if not name:
                    continue

                # ── Category ──────────────────────────────────────────────
                cat_raw = row.get('Catégories', '').strip()
                # Take primary category (first before comma or "offres spéciales")
                cat_parts = [p.strip() for p in cat_raw.split(',')]
                cat_name = next(
                    (p for p in cat_parts if 'offres' not in p.lower() and p),
                    cat_parts[0] if cat_parts else ''
                )
                category = None

                if cat_name:
                    cat_slug = slugify(cat_name)
                    if cat_slug not in cat_cache:
                        unique_cat_slug = make_unique_slug(cat_slug, existing_cat_slugs)
                        order = CAT_ORDER.get(cat_slug, cats_created)
                        category = Category.objects.create(
                            name=cat_name,
                            slug=unique_cat_slug,
                            is_active=True,
                            order=order,
                        )
                        cat_cache[cat_slug] = category
                        cats_created += 1
                        self.stdout.write(f'  [CAT] {cat_name}')
                    else:
                        category = cat_cache[cat_slug]

                # ── Prices ────────────────────────────────────────────────
                regular_price = parse_price(row.get('Tarif régulier', '')) or 0
                promo_price = parse_price(row.get('Tarif promo', ''))

                # ── Stock / flags ─────────────────────────────────────────
                is_featured = row.get('Mis en avant ?', '').strip() == '1'
                in_stock = row.get('En stock ?', '').strip() == '1'
                stock_raw = row.get('Stock', '').strip()
                stock = int(stock_raw) if stock_raw.isdigit() else (10 if in_stock else 0)

                # ── Description ───────────────────────────────────────────
                short_desc = strip_html(row.get('Description courte', ''))
                long_desc = strip_html(row.get('Description', ''))
                description = long_desc or short_desc

                # ── Images ────────────────────────────────────────────────
                image_urls = parse_images(row.get('Images', ''))

                # ── Slug ──────────────────────────────────────────────────
                unique_slug = make_unique_slug(slugify(name), existing_product_slugs)

                # ── Create product ────────────────────────────────────────
                product = Product(
                    name=name,
                    slug=unique_slug,
                    category=category,
                    description=description,
                    price=regular_price,
                    promo_price=promo_price if (promo_price and promo_price < regular_price) else None,
                    stock=stock,
                    is_featured=is_featured,
                    is_new=False,
                    is_active=True,
                )
                product.save()
                products_created += 1

                # ── Download & attach images ──────────────────────────────
                if download_imgs and image_urls:
                    # Thumbnail = first image
                    thumb_url = image_urls[0]
                    filename, data = download_image(thumb_url)
                    if data:
                        product.thumbnail.save(filename, ContentFile(data), save=True)
                        images_downloaded += 1
                        self.stdout.write(f'  [IMG] {name} -> thumbnail saved')
                    else:
                        self.stdout.write(f'  [WARN] {name} -> could not download thumbnail from {thumb_url}')

                    # Additional images → ProductImage
                    for idx, img_url in enumerate(image_urls[1:], start=1):
                        filename2, data2 = download_image(img_url)
                        if data2:
                            pi = ProductImage(product=product, order=idx)
                            pi.image.save(filename2, ContentFile(data2), save=True)
                            images_downloaded += 1
                else:
                    self.stdout.write(f'  [OK] {name}')

                # ── Set category image from first product ─────────────────
                if download_imgs and category and not category.image and image_urls:
                    filename, data = download_image(image_urls[0])
                    if data:
                        category.image.save(filename, ContentFile(data), save=True)
                        self.stdout.write(f'  [CAT-IMG] {category.name} -> image set')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done: {products_created} products, {cats_created} categories, {images_downloaded} images downloaded.'
        ))
