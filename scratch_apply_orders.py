import re

with open('frontend/src/pages/admin/AdminOrders.jsx', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Add boutique status to STATUS_LABELS
content = re.sub(r"(returned: '[^']+',)", r"\1\n  boutique: 'En Boutique',", content)

# 2. Add boutique status to STATUS_BADGE
content = re.sub(r"(returned: 'badge-returned',)", r"\1\n  boutique: 'badge-pending',", content)

# 3. In the table, show boutique name if status is boutique
# Let's find where status is rendered and append boutique name if present.
# It's at `{STATUS_LABELS[o.status]}`
target = "{STATUS_LABELS[o.status]}"
replacement = '''{STATUS_LABELS[o.status]}
                            {o.status === 'boutique' && o.boutique_name && (
                              <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#8b5cf6', fontWeight: 600 }}>
                                {o.boutique_name}
                              </div>
                            )}'''
content = content.replace(target, replacement)

with open('frontend/src/pages/admin/AdminOrders.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
