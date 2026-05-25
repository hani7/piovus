from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from pioveapp.models import Category, Product, Banner


CATEGORIES = [
    {'name': 'Eyes', 'slug': 'eyes', 'order': 1},
    {'name': 'Face', 'slug': 'face', 'order': 2},
    {'name': 'Lips', 'slug': 'lips', 'order': 3},
    {'name': 'Nails', 'slug': 'nails', 'order': 4},
    {'name': 'Skin Care & Body', 'slug': 'skin-care-body', 'order': 5},
    {'name': 'Accessoires', 'slug': 'accessoires', 'order': 6},
]

PRODUCTS = [
    # EYES
    {'name': 'Mascara Volume Extrême', 'slug': 'mascara-volume-extreme', 'category': 'eyes', 'price': 1850, 'promo_price': 1500, 'stock': 50, 'is_featured': True, 'is_new': True, 'description': 'Mascara longue tenue pour un volume exceptionnel. Formule waterproof résistante à la chaleur et à l\'humidité.'},
    {'name': 'Palette Fards à Paupières Nude', 'slug': 'palette-fards-paupieres-nude', 'category': 'eyes', 'price': 2900, 'stock': 30, 'is_featured': True, 'description': 'Palette de 12 teintes nude pour un regard naturel ou smoky. Longue tenue jusqu\'à 16h.'},
    {'name': 'Crayon Yeux Noir Intense', 'slug': 'crayon-yeux-noir-intense', 'category': 'eyes', 'price': 850, 'stock': 80, 'description': 'Crayon khôl intense pour un regard profond. Formule douce et confortable.'},
    {'name': 'Eyeliner Précision Waterproof', 'slug': 'eyeliner-precision-waterproof', 'category': 'eyes', 'price': 1200, 'promo_price': 990, 'stock': 45, 'is_new': True, 'description': 'Eyeliner liquide à pointe fine pour un trait parfait. Résistant à l\'eau.'},
    {'name': 'Faux Cils Volume XL', 'slug': 'faux-cils-volume-xl', 'category': 'eyes', 'price': 750, 'stock': 60, 'description': 'Faux cils réutilisables pour un effet dramatique. Bande confortable à porter toute la journée.'},
    {'name': 'Sérum Sourcils Fortifiant', 'slug': 'serum-sourcils-fortifiant', 'category': 'eyes', 'price': 2200, 'stock': 25, 'is_featured': True, 'description': 'Sérum nutritif pour des sourcils plus denses et définis. Résultats visibles en 4 semaines.'},

    # FACE
    {'name': 'Fond de Teint Hydratant SPF30', 'slug': 'fond-teint-hydratant-spf30', 'category': 'face', 'price': 3200, 'promo_price': 2700, 'stock': 40, 'is_featured': True, 'description': 'Fond de teint couvrance modulable avec protection solaire SPF30. 12 teintes adaptées aux peaux méditerranéennes.'},
    {'name': 'Blush Satiné Rose Poudré', 'slug': 'blush-satine-rose-poudre', 'category': 'face', 'price': 1650, 'stock': 55, 'is_new': True, 'description': 'Blush satiné pour un teint frais et lumineux. Couleur buildable et longue tenue.'},
    {'name': 'Poudre Fixante Éclat', 'slug': 'poudre-fixante-eclat', 'category': 'face', 'price': 1900, 'stock': 35, 'is_featured': True, 'description': 'Poudre libre translucide pour fixer le maquillage et apporter de l\'éclat.'},
    {'name': 'Correcteur Anti-Cernes Longue Tenue', 'slug': 'correcteur-anti-cernes', 'category': 'face', 'price': 1400, 'stock': 50, 'description': 'Correcteur haute couvrance pour masquer les cernes et imperfections.'},
    {'name': 'Contouring Palette Sculptante', 'slug': 'contouring-palette-sculptante', 'category': 'face', 'price': 2500, 'promo_price': 2100, 'stock': 30, 'description': 'Palette contouring 3 teintes pour sculpter et illuminer le visage.'},
    {'name': 'Enlumineur Glow Dorée', 'slug': 'enlumineur-glow-doree', 'category': 'face', 'price': 1800, 'stock': 45, 'is_new': True, 'description': 'Highlighter doré pour un éclat intense sur les points hauts du visage.'},

    # LIPS
    {'name': 'Rouge à Lèvres Velours Rouge Baiser', 'slug': 'rouge-levres-velours-rouge-baiser', 'category': 'lips', 'price': 1100, 'stock': 70, 'is_featured': True, 'description': 'Rouge à lèvres velours intense à longue tenue. Formule confortable et non-desséchante.'},
    {'name': 'Gloss Brillant Repulpant', 'slug': 'gloss-brillant-repulpant', 'category': 'lips', 'price': 950, 'promo_price': 750, 'stock': 65, 'is_new': True, 'description': 'Gloss repulpant pour des lèvres volumineuses et brillantes.'},
    {'name': 'Crayon Contour Lèvres', 'slug': 'crayon-contour-levres', 'category': 'lips', 'price': 700, 'stock': 90, 'description': 'Crayon contour pour définir et agrandir le regard des lèvres.'},
    {'name': 'Baume Teinté Hydratant', 'slug': 'baume-teinte-hydratant', 'category': 'lips', 'price': 850, 'stock': 75, 'description': 'Baume teinté pour des lèvres hydratées et légèrement colorées.'},
    {'name': 'Liquid Lipstick Mat Ultra-Durable', 'slug': 'liquid-lipstick-mat-ultra-durable', 'category': 'lips', 'price': 1300, 'stock': 50, 'is_featured': True, 'description': 'Rouge à lèvres liquide mat à tenue extrême jusqu\'à 24h.'},

    # NAILS
    {'name': 'Vernis Gel Longue Tenue', 'slug': 'vernis-gel-longue-tenue', 'category': 'nails', 'price': 650, 'stock': 120, 'is_featured': True, 'description': 'Vernis semi-permanent effet gel. Jusqu\'à 3 semaines sans écaillage.'},
    {'name': 'Base Coat Protectrice', 'slug': 'base-coat-protectrice', 'category': 'nails', 'price': 550, 'stock': 80, 'description': 'Base protectrice pour prolonger la tenue du vernis et protéger l\'ongle.'},
    {'name': 'Top Coat Brillance Extrême', 'slug': 'top-coat-brillance-extreme', 'category': 'nails', 'price': 550, 'stock': 80, 'description': 'Top coat ultra-brillant à séchage rapide pour un fini parfait.'},
    {'name': 'Kit Nail Art 12 Couleurs', 'slug': 'kit-nail-art-12-couleurs', 'category': 'nails', 'price': 1800, 'promo_price': 1500, 'stock': 30, 'is_new': True, 'description': 'Kit complet nail art avec 12 couleurs vives et accessoires de décoration.'},

    # SKIN CARE
    {'name': 'Crème Hydratante Éclat Vitamine C', 'slug': 'creme-hydratante-vitamine-c', 'category': 'skin-care-body', 'price': 3500, 'stock': 40, 'is_featured': True, 'is_new': True, 'description': 'Crème de jour à la Vitamine C pour un teint lumineux et unifié. SPF15.'},
    {'name': 'Sérum Anti-Âge Acide Hyaluronique', 'slug': 'serum-anti-age-acide-hyaluronique', 'category': 'skin-care-body', 'price': 4200, 'promo_price': 3800, 'stock': 25, 'is_featured': True, 'description': 'Sérum concentré à l\'acide hyaluronique pour une peau repulpée et lissée.'},
    {'name': 'Masque Purifiant Argile', 'slug': 'masque-purifiant-argile', 'category': 'skin-care-body', 'price': 1800, 'stock': 60, 'description': 'Masque à l\'argile pour nettoyer les pores et matifier la peau.'},
    {'name': 'Lotion Tonique Éclat Rose', 'slug': 'lotion-tonique-eclat-rose', 'category': 'skin-care-body', 'price': 1600, 'stock': 50, 'description': 'Lotion tonique à l\'eau de rose pour tonifier et rafraîchir le teint.'},

    # ACCESSOIRES
    {'name': 'Pinceau Kabuki 3D', 'slug': 'pinceau-kabuki-3d', 'category': 'accessoires', 'price': 1200, 'stock': 45, 'is_featured': True, 'description': 'Pinceau kabuki professionnel pour une application parfaite des poudres.'},
    {'name': 'Set 12 Pinceaux Professionnels', 'slug': 'set-12-pinceaux-professionnels', 'category': 'accessoires', 'price': 4500, 'promo_price': 3900, 'stock': 20, 'is_new': True, 'description': 'Set complet de 12 pinceaux de maquillage en poils synthétiques premium.'},
    {'name': 'Éponge Teardrop Blending', 'slug': 'eponge-teardrop-blending', 'category': 'accessoires', 'price': 650, 'stock': 100, 'description': 'Éponge de maquillage en forme de goutte pour une application sans trace.'},
    {'name': 'Miroir de Poche Compact', 'slug': 'miroir-poche-compact', 'category': 'accessoires', 'price': 450, 'stock': 80, 'description': 'Miroir compact élégant à glisser dans votre sac à main.'},
    {'name': 'Trousse de Maquillage Grande', 'slug': 'trousse-maquillage-grande', 'category': 'accessoires', 'price': 1800, 'stock': 35, 'description': 'Grande trousse de maquillage avec plusieurs compartiments organisateurs.'},
]

BANNERS = [
    {
        'title': 'Sublimez Votre Beauté',
        'subtitle': 'Découvrez notre nouvelle collection printemps 2026',
        'cta_label': 'Découvrir',
        'cta_url': '/shop',
        'order': 1,
    },
    {
        'title': 'Offres Spéciales',
        'subtitle': 'Jusqu\'à -30% sur une sélection de produits',
        'cta_label': 'Profiter',
        'cta_url': '/shop?promo=true',
        'promo_code': 'PIOVE30',
        'order': 2,
    },
    {
        'title': 'Soins & Beauté Premium',
        'subtitle': 'Des formules experts pour sublimer votre peau',
        'cta_label': 'Explorer',
        'cta_url': '/category/skin-care-body',
        'order': 3,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with Piové Cosmetics sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding categories...')
        cat_map = {}
        for c in CATEGORIES:
            cat, created = Category.objects.get_or_create(slug=c['slug'], defaults=c)
            cat_map[c['slug']] = cat
            self.stdout.write(f'  {"Created" if created else "Exists"}: {cat.name}')

        self.stdout.write('Seeding products...')
        for p in PRODUCTS:
            cat_slug = p.pop('category')
            p['category'] = cat_map[cat_slug]
            prod, created = Product.objects.get_or_create(slug=p['slug'], defaults=p)
            self.stdout.write(f'  {"Created" if created else "Exists"}: {prod.name}')

        self.stdout.write('Seeding banners (no images - add via admin)...')
        for b in BANNERS:
            banner, created = Banner.objects.get_or_create(title=b['title'], defaults={**b, 'image': ''})
            self.stdout.write(f'  {"Created" if created else "Exists"}: {banner.title}')

        # Create superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@piove.dz', 'piove2026')
            self.stdout.write('Superuser created: admin / piove2026')

        self.stdout.write(self.style.SUCCESS('Seed data loaded successfully!'))
