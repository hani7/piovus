import sqlite3

db_path = r"C:\Users\PC\Documents\piove\db (4).sqlite3"

# Manual data for products not found in CSV
manual_data = {
    387: {  # Perfect Nude Nail polish
        'short_description': '12ml  Le Perfect Nude Nail Polish offre des teintes nude élégantes pour une manucure naturelle et soignée, avec une longue tenue.',
        'contenance': 12.0, 'contenance_unit': 'ml',
    },
    390: {  # Pencil Eye Waterproof et khôl
        'short_description': 'Un crayon khôl waterproof pour un regard intense et longue tenue. Formule douce et confortable pour les yeux sensibles.',
        'contenance': None, 'contenance_unit': '',
    },
    392: {  # Disque démaquillant
        'contenance': None, 'contenance_unit': '',
    },
    401: {  # Magic Oil Nail Care
        'contenance': None, 'contenance_unit': '',
    },
    402: {  # APP01 Pinceau poudre
        'short_description': 'Pinceau poudre professionnel pour une application parfaite. Soies ultra-douces pour un fini naturel et unifié.',
        'contenance': None, 'contenance_unit': '',
    },
    403: {  # APP02 Pinceau fond de teint
        'short_description': 'Pinceau fond de teint à soies synthétiques ultra-souples pour une application précise et un rendu impeccable.',
        'contenance': None, 'contenance_unit': '',
    },
    404: {  # APP03 Pinceau Kabuki 3D
        'short_description': 'Pinceau Kabuki 3D à soies denses pour une application rapide et uniforme de votre poudre ou fond de teint.',
        'contenance': None, 'contenance_unit': '',
    },
    405: {  # APP04 Pinceau Highlighter
        'short_description': 'Pinceau Highlighter en éventail pour déposer la poudre illuminatrice avec précision sur les zones à mettre en valeur.',
        'contenance': None, 'contenance_unit': '',
    },
    406: {  # APP05 Pinceau estompeur précis
        'short_description': "Pinceau estompeur de précision pour fondre et mélanger les produits en toute subtilité pour un résultat professionnel.",
        'contenance': None, 'contenance_unit': '',
    },
    407: {  # APP06 Pinceau estompeur blending
        'short_description': "Pinceau estompeur blending à soies synthétiques pour mélanger vos fards à paupières avec fluidité.",
        'contenance': None, 'contenance_unit': '',
    },
    408: {  # APP07 Pinceau à paupières
        'short_description': "Pinceau à paupières plat pour une application précise de vos fards à paupières. Idéal pour les looks naturels et soirée.",
        'contenance': None, 'contenance_unit': '',
    },
    409: {  # APP08 Pinceau crayon fard à paupières
        'short_description': "Pinceau crayon pour estomper les crayons et fards à paupières avec précision pour un regard défini.",
        'contenance': None, 'contenance_unit': '',
    },
    410: {  # APP09 Pinceau à sourcils
        'short_description': "Pinceau à sourcils biseauté pour sculpter et définir les sourcils avec naturel et précision.",
        'contenance': None, 'contenance_unit': '',
    },
    418: {  # Color Expert CE384 Hazel brown
        'short_description': "12ml  Le vernis à ongles Color Expert Hazel Brown CE384 propose une couleur marron noisette élégante pour une manucure raffinée.",
        'contenance': 12.0, 'contenance_unit': 'ml',
    },
    419: {  # Color Expert CE617 Mocha mousse
        'short_description': "12ml  Le vernis à ongles Color Expert Mocha Mousse CE617 offre une teinte café-mousse tendance et longue tenue.",
        'contenance': 12.0, 'contenance_unit': 'ml',
    },
    420: {  # Color Expert CE618 Towny Brown
        'short_description': "12ml  Le vernis à ongles Color Expert Towny Brown CE618 propose une teinte marron urbaine et sophistiquée.",
        'contenance': 12.0, 'contenance_unit': 'ml',
    },
    421: {  # Collection Pastel Color Expert
        'short_description': "12ml  La Collection Pastel Color Expert regroupe les plus belles teintes pastels pour une manucure douce et printanière.",
        'contenance': 12.0, 'contenance_unit': 'ml',
    },
}

conn   = sqlite3.connect(db_path)
cursor = conn.cursor()

updated = 0
for pid, data in manual_data.items():
    set_parts = []
    params    = []

    short = data.get('short_description')
    cont  = data.get('contenance')
    unit  = data.get('contenance_unit', '')

    # Fetch current values
    cursor.execute("SELECT short_description, contenance, contenance_unit FROM pioveapp_product WHERE id=?", (pid,))
    row = cursor.fetchone()
    if not row:
        print(f"  SKIP id={pid}: not found in DB")
        continue

    db_short, db_cont, db_unit = row

    if short and (not db_short):
        set_parts.append("short_description = ?")
        params.append(short[:299])
    if cont is not None and db_cont is None:
        set_parts.append("contenance = ?")
        params.append(cont)
    if unit and (not db_unit):
        set_parts.append("contenance_unit = ?")
        params.append(unit)

    if set_parts:
        params.append(pid)
        cursor.execute(f"UPDATE pioveapp_product SET {', '.join(set_parts)} WHERE id=?", params)
        updated += 1
        print(f"  UPDATED id={pid}")
    else:
        print(f"  SKIP id={pid}: already filled or no new data")

conn.commit()
conn.close()
print(f"\nDone. {updated} products updated.")
