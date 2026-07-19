import base64
import re
import os

logo_path = r"c:\Users\PC\Documents\piove\frontend\public\logo.png"
md_path = r"C:\Users\PC\.gemini\antigravity\brain\f0a1c7b6-c548-4999-ab05-97acb0bee5d4\rapport_gerant_piove.md"
output_path = r"C:\Users\PC\Desktop\Dossier_Livraison_Piove.html"

# Read and encode logo
try:
    with open(logo_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    logo_src = f"data:image/png;base64,{encoded_string}"
except Exception as e:
    logo_src = ""
    print(f"Error reading logo: {e}")

# Read markdown
try:
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
except Exception as e:
    md_content = "Error reading markdown."
    print(f"Error reading markdown: {e}")

# Remove the title block for the body parsing
lines = md_content.split('\n')
body_lines = lines[8:] if len(lines) > 8 else lines
body_md = '\n'.join(body_lines)

# Basic Markdown to HTML parsing
body_html = body_md
body_html = re.sub(r'(?m)^## (\d+)\. (.+)$', r'<h2 class="section-title"><span class="section-number">\1.</span> \2</h2>', body_html)
body_html = re.sub(r'(?m)^### (.+)$', r'<h3 class="subsection-title">\1</h3>', body_html)
body_html = re.sub(r'(?m)^#### (.+)$', r'<h4>\1</h4>', body_html)
body_html = re.sub(r'(?m)^---$', r'<div class="divider"></div>', body_html)
body_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', body_html)
body_html = re.sub(r'`([^`]+)`', r'<code class="inline-code">\1</code>', body_html)
body_html = re.sub(r'(?m)^> ⚠️ (.+)$', r'<div class="alert alert-warning">\1</div>', body_html)
body_html = re.sub(r'(?m)^> ✅ (.+)$', r'<div class="alert alert-success">\1</div>', body_html)
body_html = re.sub(r'(?m)^> (.+)$', r'<div class="alert alert-info">\1</div>', body_html)

# Process tables (very basic)
# Remove formatting rows
body_html = re.sub(r'(?m)^\|---\|---\|.*?$', '', body_html)
body_html = re.sub(r'(?m)^\|---\|---\|---\|.*?$', '', body_html)
body_html = re.sub(r'(?m)^\|---\|.*?$', '', body_html)

def table_repl(match):
    row = match.group(0)
    if not row.strip() or '---' in row: return ''
    cells = [c.strip() for c in row.strip('|').split('|')]
    if 'Colonne' in cells or 'Utilisateur' in cells and 'Rôle' in cells: # simplistic header detection
        return '<tr>' + ''.join(f'<th>{c}</th>' for c in cells) + '</tr>'
    return '<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>'

body_html = re.sub(r'(?m)^\|.*\|$', table_repl, body_html)
# Wrap consecutive trs in table
body_html = re.sub(r'(<tr>.*?</tr>\n?)+', lambda m: '<table class="corporate-table">\n' + m.group(0) + '</table>\n', body_html, flags=re.DOTALL)

# HTML Template
html_template = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dossier de Livraison - Piové Cosmetics</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600&display=swap');

        :root {{
            --primary-color: #000000;
            --secondary-color: #4a4a4a;
            --accent-color: #c9485b; /* Keeping the Piove red as accent */
            --bg-light: #f8f9fa;
            --border-color: #e0e0e0;
            --text-main: #333333;
            --text-muted: #666666;
            --font-heading: 'Montserrat', sans-serif;
            --font-body: 'Open Sans', sans-serif;
        }}

        body {{
            font-family: var(--font-body);
            color: var(--text-main);
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-size: 11pt;
        }}

        /* Typography */
        h1, h2, h3, h4, h5, h6 {{
            font-family: var(--font-heading);
            color: var(--primary-color);
            margin-top: 0;
        }}

        /* Cover Page */
        .cover-page {{
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2in 1in;
            box-sizing: border-box;
            border-left: 15px solid var(--primary-color);
            page-break-after: always;
        }}

        .cover-logo {{
            max-width: 250px;
            margin-bottom: 2rem;
        }}

        .cover-type {{
            font-size: 14pt;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--secondary-color);
            margin-bottom: 1rem;
            font-weight: 600;
        }}

        .cover-title {{
            font-size: 36pt;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 0.5rem;
            color: var(--primary-color);
        }}

        .cover-subtitle {{
            font-size: 20pt;
            font-weight: 300;
            color: var(--text-muted);
            margin-bottom: 4rem;
        }}

        .cover-meta {{
            margin-top: auto;
            border-top: 2px solid var(--border-color);
            padding-top: 2rem;
            display: flex;
            justify-content: space-between;
        }}

        .meta-item label {{
            display: block;
            font-size: 9pt;
            text-transform: uppercase;
            color: var(--text-muted);
            letter-spacing: 1px;
            margin-bottom: 4px;
        }}

        .meta-item span {{
            font-size: 11pt;
            font-weight: 600;
            color: var(--primary-color);
        }}

        /* Table of Contents */
        .toc-page {{
            padding: 1in;
            page-break-after: always;
        }}

        .toc-header {{
            font-size: 24pt;
            margin-bottom: 2rem;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 0.5rem;
        }}

        .toc-list {{
            list-style: none;
            padding: 0;
        }}

        .toc-item {{
            display: flex;
            margin-bottom: 1rem;
            font-size: 12pt;
        }}

        .toc-item-num {{
            font-weight: 700;
            width: 40px;
            color: var(--primary-color);
        }}

        .toc-item-text {{
            flex-grow: 1;
            font-weight: 500;
        }}

        /* Content Pages */
        .content-container {{
            padding: 1in;
            max-width: 210mm;
            margin: 0 auto;
        }}

        .section-title {{
            font-size: 22pt;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
            page-break-after: avoid;
        }}

        .section-number {{
            color: var(--accent-color);
        }}

        .subsection-title {{
            font-size: 16pt;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: var(--secondary-color);
        }}

        p {{
            margin-bottom: 1rem;
            text-align: justify;
        }}

        /* Elements */
        .corporate-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 10pt;
        }}

        .corporate-table th, .corporate-table td {{
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-color);
            text-align: left;
        }}

        .corporate-table th {{
            background-color: var(--bg-light);
            font-family: var(--font-heading);
            font-weight: 600;
            color: var(--primary-color);
            text-transform: uppercase;
            font-size: 9pt;
            letter-spacing: 0.5px;
        }}

        .corporate-table tr:hover {{
            background-color: #fcfcfc;
        }}

        .alert {{
            padding: 15px 20px;
            margin: 1.5rem 0;
            border-left: 4px solid;
            background-color: var(--bg-light);
            font-size: 10.5pt;
        }}

        .alert-warning {{
            border-color: #f59e0b;
        }}
        
        .alert-success {{
            border-color: #10b981;
        }}

        .alert-info {{
            border-color: #3b82f6;
        }}

        .inline-code {{
            font-family: 'Courier New', Courier, monospace;
            background-color: var(--bg-light);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            color: var(--secondary-color);
        }}

        .divider {{
            height: 1px;
            background-color: var(--border-color);
            margin: 2rem 0;
        }}

        ul, ol {{
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
        }}

        li {{
            margin-bottom: 0.5rem;
        }}

        /* Print Specifics */
        @media print {{
            @page {{
                margin: 0;
                size: A4;
            }}
            body {{
                background-color: #ffffff;
            }}
            .cover-page, .toc-page, .content-container {{
                box-shadow: none;
            }}
            .section-title {{
                page-break-before: always;
            }}
            .section-title:first-of-type {{
                page-break-before: avoid;
            }}
            .corporate-table {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>

    <!-- Cover Page -->
    <div class="cover-page">
        <img src="{logo_src}" alt="Piové Cosmetics" class="cover-logo">
        <div class="cover-type">Dossier d'Exploitation</div>
        <h1 class="cover-title">Livraison de Projet<br>E-Commerce</h1>
        <div class="cover-subtitle">Plateforme B2C & B2B - Piové Cosmetics</div>
        
        <div class="cover-meta">
            <div class="meta-item">
                <label>Client</label>
                <span>Piové Cosmetics</span>
            </div>
            <div class="meta-item">
                <label>Date</label>
                <span>Juillet 2026</span>
            </div>
            <div class="meta-item">
                <label>Version</label>
                <span>1.0 Finale</span>
            </div>
            <div class="meta-item">
                <label>Confidentialité</label>
                <span>Interne Restreint</span>
            </div>
        </div>
    </div>

    <!-- Table of Contents -->
    <div class="toc-page">
        <h2 class="toc-header">Sommaire Exécutif</h2>
        <ul class="toc-list">
            <li class="toc-item"><span class="toc-item-num">01.</span><span class="toc-item-text">Présentation Générale</span></li>
            <li class="toc-item"><span class="toc-item-num">02.</span><span class="toc-item-text">Comptes d'Accès et Privilèges</span></li>
            <li class="toc-item"><span class="toc-item-num">03.</span><span class="toc-item-text">Fonctionnalités du Panel d'Administration</span></li>
            <li class="toc-item"><span class="toc-item-num">04.</span><span class="toc-item-text">Intégration Partenaire: Mylerz (Logistique)</span></li>
            <li class="toc-item"><span class="toc-item-num">05.</span><span class="toc-item-text">Architecture Frontend (Boutique Client)</span></li>
            <li class="toc-item"><span class="toc-item-num">06.</span><span class="toc-item-text">Architecture Technique & Infrastructure</span></li>
            <li class="toc-item"><span class="toc-item-num">07.</span><span class="toc-item-text">Procédures Opérationnelles d'Urgence</span></li>
            <li class="toc-item"><span class="toc-item-num">08.</span><span class="toc-item-text">Indicateurs de Performance (KPIs)</span></li>
            <li class="toc-item"><span class="toc-item-num">09.</span><span class="toc-item-text">Matrice de Contacts</span></li>
            <li class="toc-item"><span class="toc-item-num">10.</span><span class="toc-item-text">Gouvernance et Notes Importantes</span></li>
            <li class="toc-item"><span class="toc-item-num">11.</span><span class="toc-item-text">Journalisation et Audit (Logs d'Activité)</span></li>
            <li class="toc-item"><span class="toc-item-num">12.</span><span class="toc-item-text">Politique de Sécurité des Systèmes d'Information (PSSI)</span></li>
        </ul>
    </div>

    <!-- Content -->
    <div class="content-container">
        {body_html}
    </div>

</body>
</html>"""

with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_template)

print(f"Professional handover document generated at {output_path}")
