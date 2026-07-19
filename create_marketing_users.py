"""
Script de création des comptes équipe Marketing.
Exécuter avec: python create_marketing_users.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.contrib.auth.models import User, Group

# 1. Créer le groupe "marketing" s'il n'existe pas
group, created = Group.objects.get_or_create(name='marketing')
if created:
    print("✅ Groupe 'marketing' créé.")
else:
    print("ℹ️  Groupe 'marketing' existait déjà.")

# 2. Définir les utilisateurs marketing
MARKETING_USERS = [
    {'username': 'amira',    'password': 'Piove@Amira2026',   'first_name': 'Amira',   'email': ''},
    {'username': 'oubaida',  'password': 'Piove@Oubaida2026', 'first_name': 'Oubaida', 'email': ''},
    {'username': 'marketing','password': 'Piove@Mktg2026',    'first_name': 'Marketing','email': ''},
]

for u_data in MARKETING_USERS:
    username = u_data['username']
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(f"ℹ️  Utilisateur '{username}' existait déjà — mise à jour du groupe.")
    else:
        user = User.objects.create_user(
            username=u_data['username'],
            password=u_data['password'],
            first_name=u_data['first_name'],
            email=u_data.get('email', ''),
        )
        print(f"✅ Utilisateur '{username}' créé.")

    # Activer is_staff pour accéder au panel admin
    user.is_staff = True
    user.save()

    # Ajouter au groupe marketing
    user.groups.set([group])
    print(f"   → '{username}' ajouté au groupe 'marketing', is_staff=True")

print("\n🎉 Terminé ! Informations de connexion :")
print("-" * 40)
for u in MARKETING_USERS:
    print(f"  Utilisateur : {u['username']}")
    print(f"  Mot de passe: {u['password']}")
    print()
