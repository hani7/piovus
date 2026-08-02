import re

def main():
    with open('frontend/src/pages/admin/AdminOrderDetail.jsx', 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    out_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Store import
        if "import { Printer, RefreshCw, Edit2 } from 'lucide-react'" in line:
            line = line.replace("Edit2 }", "Edit2, Store }")
            
        # 2. STATUS_LABELS
        if "  returned: 'Retour" in line and "}" not in lines[i+1]:
            # we know the next line is the closing bracket for STATUS_LABELS
            if "}" in lines[i+1]:
                out_lines.append(line)
                out_lines.append("  boutique: 'En Boutique',\n")
                i += 1
                continue
                
        # 3. STATUS_BADGE
        if "  returned: 'badge-returned'" in line:
            if "}" in lines[i+1]:
                out_lines.append(line)
                out_lines.append("  boutique: 'badge-pending',\n")
                i += 1
                continue
                
        # 4. State variables
        if "const [mylerzStatusDate, setMylerzStatusDate] = useState(null)" in line:
            out_lines.append(line)
            out_lines.append("\n  // Boutique Transfer State\n")
            out_lines.append("  const [showBoutiqueModal, setShowBoutiqueModal] = useState(false)\n")
            out_lines.append("  const [boutiquesList, setBoutiquesList] = useState([])\n")
            out_lines.append("  const [selectedBoutique, setSelectedBoutique] = useState('')\n")
            out_lines.append("  const [transferring, setTransferring] = useState(false)\n")
            i += 1
            continue

        # 5. useEffect and fetchBoutiques
        if "useEffect(() => { load() }, [id])" in line:
            out_lines.append("  useEffect(() => {\n    load()\n    fetchBoutiques()\n  }, [id])\n\n")
            out_lines.append("  const fetchBoutiques = async () => {\n")
            out_lines.append("    try {\n")
            out_lines.append("      const res = await adminClient.get('/admin/boutiques/')\n")
            out_lines.append("      if (Array.isArray(res.data)) {\n")
            out_lines.append("        setBoutiquesList(res.data.filter(b => b.is_active))\n")
            out_lines.append("      }\n")
            out_lines.append("    } catch (e) { console.error(e) }\n")
            out_lines.append("  }\n\n")
            out_lines.append("  const handleTransferBoutique = async () => {\n")
            out_lines.append("    if (!selectedBoutique) return alert('Veuillez s\\u00e9lectionner une boutique.')\n")
            out_lines.append("    setTransferring(true)\n")
            out_lines.append("    try {\n")
            out_lines.append("      await adminClient.post(`/admin/orders/${id}/transfer_to_boutique/`, { boutique_id: selectedBoutique })\n")
            out_lines.append("      setShowBoutiqueModal(false)\n")
            out_lines.append("      load()\n")
            out_lines.append("    } catch (e) { alert(e.response?.data?.error || 'Erreur lors du transfert.') } finally { setTransferring(false) }\n")
            out_lines.append("  }\n\n")
            i += 1
            continue
            
        # 6. EXPEDIER button
        if "onClick={handleMylerzShip} disabled={mylerzLoading}" in line:
            line = line.replace("disabled={mylerzLoading}", "disabled={mylerzLoading || detail.status === 'boutique'}")
            
        # Add boutique button right after EXPEDIER block
        if "EXP" in line and "DIER" in line and "               </button>" in lines[i+1]:
            out_lines.append(line)
            out_lines.append(lines[i+1])
            out_lines.append("               {detail.status !== 'boutique' && (\n")
            out_lines.append("                 <button className=\"admin-btn-secondary\" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, backgroundColor: '#8b5cf6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowBoutiqueModal(true)}>\n")
            out_lines.append("                   <Store size={14} /> BOUTIQUE\n")
            out_lines.append("                 </button>\n")
            out_lines.append("               )}\n")
            i += 2
            continue
            
        # 7. Add Modal at the end before last div
        if "    </div>" in line and i >= len(lines) - 4:
            modal = '''      {/* Boutique Transfer Modal */}
      {showBoutiqueModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Transf\\u00e9rer \\u00e0 une Boutique</h3>
              <button className="modal-close" onClick={() => setShowBoutiqueModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-4">
                En transf\\u00e9rant cette commande, son statut passera \\u00e0 <strong>En Boutique</strong>. Un email sera envoy\\u00e9 au client pour l'informer que sa commande est pr\\u00eate \\u00e0 \\u00eatre r\\u00e9cup\\u00e9r\\u00e9e.
              </p>
              <div className="form-group">
                <label>S\\u00e9lectionner la boutique</label>
                <select className="form-control" value={selectedBoutique} onChange={e => setSelectedBoutique(e.target.value)}>
                  <option value="">-- Choisir une boutique --</option>
                  {boutiquesList.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.wilaya})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowBoutiqueModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleTransferBoutique} disabled={!selectedBoutique || transferring}>
                {transferring ? 'Transfert...' : 'Confirmer le transfert'}
              </button>
            </div>
          </div>
        </div>
      )}
'''
            out_lines.append(modal)
            out_lines.append(line)
            i += 1
            continue

        out_lines.append(line)
        i += 1

    with open('frontend/src/pages/admin/AdminOrderDetail.jsx', 'w', encoding='utf-8') as f:
        f.writelines(out_lines)

if __name__ == '__main__':
    main()
