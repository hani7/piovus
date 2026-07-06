"""
Emergency fix migration — creates pioveapp_product_categories if missing.
Safe to run on all environments (uses IF NOT EXISTS).
"""

from django.db import migrations


def create_m2m_table_if_missing(apps, schema_editor):
    """
    The production DB may be missing the pioveapp_product_categories M2M
    table if migrations 0037–0039 never ran successfully.
    This migration creates the table using raw SQL with IF NOT EXISTS,
    which is idempotent and safe to run multiple times.
    """
    schema_editor.execute("""
        CREATE TABLE IF NOT EXISTS "pioveapp_product_categories" (
            "id"          integer NOT NULL PRIMARY KEY AUTOINCREMENT,
            "product_id"  integer NOT NULL REFERENCES "pioveapp_product" ("id"),
            "category_id" integer NOT NULL REFERENCES "pioveapp_category" ("id"),
            UNIQUE ("product_id", "category_id")
        )
    """)


def reverse_noop(apps, schema_editor):
    pass  # Do not drop on reverse — too risky


class Migration(migrations.Migration):

    dependencies = [
        ('pioveapp', '0045_sitesettings_meta_pixel'),
    ]

    operations = [
        migrations.RunPython(create_m2m_table_if_missing, reverse_noop),
    ]
