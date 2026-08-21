const fs = require('fs');
let lines = fs.readFileSync('src/pages/admin/AdminProducts.jsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('<div style={{ borderTop: \'1px dashed var(--admin-border)\', paddingTop: \'20px\', marginTop: \'10px\' }}>'));
const endIdx = startIdx + 73; 

const newCode = `                            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center' }}>
                              <button type="button" className="btn-secondary" onClick={() => { cancelEditVariant(); setShowVariantModal(true); }}>
                                <Plus size={16} /> Ajouter une variation
                              </button>
                            </div>

                            {showVariantModal && (
                              <div className="admin-modal-overlay" style={{ zIndex: 100 }}>
                                <div className="admin-modal" style={{ maxWidth: '600px', padding: '24px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '15px' }}>
                                    <h4 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>{editVariantId ? 'Modifier la variation' : 'Ajouter une variation'}</h4>
                                    <button type="button" onClick={() => { cancelEditVariant(); setShowVariantModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                                      <X size={20} />
                                    </button>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>`;

const bottomParts = lines.slice(startIdx + 3, endIdx).map(line => line.replace('Annuler modification', 'Annuler'));
const closingTags = `                                </div>
                              </div>
                            )}`;

const newLines = [newCode, ...bottomParts, closingTags];
lines.splice(startIdx, endIdx - startIdx + 1, newLines.join('\n'));

fs.writeFileSync('src/pages/admin/AdminProducts.jsx', lines.join('\n'));
console.log('Replaced successfully');
