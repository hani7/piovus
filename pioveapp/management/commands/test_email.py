"""
Commande de test email — a executer sur le serveur via:
python manage.py test_email
"""
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


class Command(BaseCommand):
    help = 'Teste l envoi email SMTP'

    def handle(self, *args, **options):
        self.stdout.write(f"EMAIL_BACKEND    : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST       : {getattr(settings, 'EMAIL_HOST', 'NON DEFINI')}")
        self.stdout.write(f"EMAIL_PORT       : {getattr(settings, 'EMAIL_PORT', 'NON DEFINI')}")
        self.stdout.write(f"EMAIL_USE_SSL    : {getattr(settings, 'EMAIL_USE_SSL', 'NON DEFINI')}")
        self.stdout.write(f"EMAIL_HOST_USER  : {getattr(settings, 'EMAIL_HOST_USER', 'NON DEFINI')}")
        self.stdout.write(f"DEFAULT_FROM     : {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write("---")

        dests = ['lbetaimi@piovecosmetics.com', 'baitul.technology@gmail.com']
        try:
            msg = EmailMultiAlternatives(
                subject='[PIOVE SERVEUR TEST] Email depuis Django',
                body='Test email depuis Django sur le serveur.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=dests,
            )
            msg.attach_alternative(
                '<h2>Test OK</h2><p>Email envoye depuis Django sur le serveur cPanel.</p>',
                'text/html'
            )
            msg.send(fail_silently=False)  # fail_silently=False pour voir l erreur
            self.stdout.write(self.style.SUCCESS(f"Email envoye avec succes a {dests}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERREUR: {type(e).__name__}: {e}"))
