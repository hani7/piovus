"""
Réinitialise l'AUTO_INCREMENT de la table orders pour que la prochaine
commande reprenne à partir du bon numéro.

Usage:
    python manage.py reset_order_sequence
    python manage.py reset_order_sequence --next 2623
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Réinitialise l'AUTO_INCREMENT de la table pioveapp_order"

    def add_arguments(self, parser):
        parser.add_argument(
            '--next',
            type=int,
            default=None,
            help='Le prochain numéro de commande souhaité (ex: 2623)'
        )

    def handle(self, *args, **options):
        next_id = options['next']

        with connection.cursor() as cursor:
            # Récupère le max actuel
            cursor.execute("SELECT MAX(id) FROM pioveapp_order")
            row = cursor.fetchone()
            current_max = row[0] or 0

        if next_id is None:
            next_id = current_max + 1

        if next_id <= current_max:
            self.stdout.write(self.style.ERROR(
                f"Erreur : le prochain ID demandé ({next_id}) est inférieur ou égal au max actuel ({current_max}). "
                f"Impossible de rétrograder l'AUTO_INCREMENT."
            ))
            return

        with connection.cursor() as cursor:
            # Fonctionne avec MySQL et SQLite
            db_engine = connection.vendor
            if db_engine == 'mysql':
                cursor.execute(f"ALTER TABLE pioveapp_order AUTO_INCREMENT = {next_id};")
                self.stdout.write(self.style.SUCCESS(
                    f"✅ MySQL AUTO_INCREMENT réinitialisé à {next_id}. Prochaine commande = #{next_id}"
                ))
            elif db_engine == 'sqlite':
                # SQLite utilise sqlite_sequence
                cursor.execute(
                    "UPDATE sqlite_sequence SET seq = %s WHERE name = 'pioveapp_order'",
                    [next_id - 1]
                )
                self.stdout.write(self.style.SUCCESS(
                    f"✅ SQLite sequence réinitialisée à {next_id - 1}. Prochaine commande = #{next_id}"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"Base de données '{db_engine}' non supportée. Faites-le manuellement."
                ))
