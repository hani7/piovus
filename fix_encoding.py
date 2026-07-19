import os
import glob

def fix_encoding(text):
    pass

files_to_fix = glob.glob("frontend/src/pages/admin/*.jsx")

for file_path in files_to_fix:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    replacements = {
        'CrÃ©er': 'Créer',
        'tÃ©lÃ©phone': 'téléphone',
        'NumÃ©ro': 'Numéro',
        'Ã©': 'é',
        'Ã¨': 'è',
        'Ãª': 'ê',
        'Ã«': 'ë',
        'Ã\xa0': 'à',
        'Ã®': 'î',
        'Ã¯': 'ï',
        'Ã¢': 'â',
        'Ã´': 'ô',
        'Ã¹': 'ù',
        'Ã»': 'û',
        'Ã§': 'ç',
        'â€”': '—',
        'ðŸ“Š': '📊',
        'Ã€': 'À',
        'DÃ©tails': 'Détails',
        'supplÃ©mentaire': 'supplémentaire',
        'RÃ©sumÃ©': 'Résumé',
        'SÃ©lectionner': 'Sélectionner',
        'complÃ¨te': 'complète',
        'Ã€ Domicile': 'À Domicile',
        'RÃ©fÃ©rent': 'Référent',
        'âš\xa0ï¸\x20': '⚠️ ',
        'âš\xa0ï¸\x8f': '⚠️',
        'âš\xa0ï¸': '⚠️',
        'crÃ©ation': 'création',
        'CrÃ©ation': 'Création'
    }
    
    new_content = content
    for k, v in replacements.items():
        new_content = new_content.replace(k, v)
        
    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed encoding in {file_path}")
