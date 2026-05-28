import csv
import re
import os
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from pioveapp.models import Category, Product


def strip_html(text):
    """Remove HTML tags from text."""
    if not text:
        return ''
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).strip()


def parse_price(val):
    """Parse price string to float or None."""
    if not val or val.strip() == '':
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def get_first_image(images_str):
    """Extract first image URL from comma-separated images string."""
    if not images_str:
        return ''
    parts = [p.strip() for p in images_str.split(',')]
    return parts[0] if parts else ''


def make_unique_slug(base_slug, existing_slugs):
    """Make a unique slug by appending a counter if needed."""
    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    existing_slugs.add(slug)
    return slug


class Command(BaseCommand):
    help = 'Import products and categories from WooCommerce CSV export'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default=r'C:\Users\PC\Downloads\wc-product-export-28-5-2026-1779955774915.csv',
            help='Path to the WooCommerce CSV file',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products and categories before import',
        )

    def handle(self, *args, **options):
        csv_path = options['csv']

        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'File not found: {csv_path}'))
            return

        if options['clear']:
            self.stdout.write('Clearing existing products and categories...')
            Product.objects.all().delete()
            Category.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared.'))

        # Track slugs to avoid duplicates
        existing_product_slugs = set(Product.objects.values_list('slug', flat=True))
        existing_cat_slugs = set(Category.objects.values_list('slug', flat=True))

        # Cache categories
        cat_cache = {c.slug: c for c in Category.objects.all()}

        products_created = 0
        products_skipped = 0
        cats_created = 0

        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            for row in reader:
                # Only import parent products (not variants - they have a Parent value)
                parent = row.get('Parent', '').strip()
                if parent:
                    continue  # skip variant rows

                # Only import published products
                published = row.get('Publié', '').strip()
                if published != '1':
                    continue

                name = row.get('Nom', '').strip()
                if not name:
                    continue

                # ── Category ──────────────────────────────────────────────
                cat_raw = row.get('Catégories', '').strip()
                # Take the first category listed (before comma)
                cat_name = cat_raw.split(',')[0].strip() if cat_raw else ''
                # Clean "offres spéciales" sub-category
                cat_name = cat_name.replace('offres spéciales', '').strip().strip(',').strip()
                category = None

                if cat_name:
                    cat_slug = slugify(cat_name)
                    if cat_slug not in cat_cache:
                        # Create new category
                        unique_cat_slug = make_unique_slug(cat_slug, existing_cat_slugs)
                        category = Category.objects.create(
                            name=cat_name,
                            slug=unique_cat_slug,
                            is_active=True,
                            order=cats_created,
                        )
                        cat_cache[cat_slug] = category
                        cats_created += 1
                        self.stdout.write(f'  [CAT] Created category: {cat_name}')
                    else:
                        category = cat_cache[cat_slug]

                # ── Prices ────────────────────────────────────────────────
                regular_price = parse_price(row.get('Tarif régulier', ''))
                promo_price = parse_price(row.get('Tarif promo', ''))

                # If no price, set a default
                if regular_price is None:
                    regular_price = 0

                # ── Flags ─────────────────────────────────────────────────
                is_featured = row.get('Mis en avant ?', '').strip() == '1'
                in_stock = row.get('En stock ?', '').strip() == '1'
                stock_qty_raw = row.get('Stock', '').strip()
                stock = int(stock_qty_raw) if stock_qty_raw.isdigit() else (10 if in_stock else 0)

                # ── Description ───────────────────────────────────────────
                short_desc = strip_html(row.get('Description courte', ''))
                long_desc = strip_html(row.get('Description', ''))
                description = long_desc or short_desc

                # ── Image ─────────────────────────────────────────────────
                images_str = row.get('Images', '')
                first_image_url = get_first_image(images_str)

                # ── Slug ──────────────────────────────────────────────────
                base_slug = slugify(name)
                unique_slug = make_unique_slug(base_slug, existing_product_slugs)

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
                self.stdout.write(f'  [OK] {name} -> {category.name if category else "No category"} | {regular_price} DA')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Import complete: {products_created} products created, '
            f'{cats_created} categories created, '
            f'{products_skipped} skipped.'
        ))
