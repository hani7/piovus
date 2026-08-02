import re

with open('frontend/src/pages/admin/AdminOrderDetail.jsx', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Add boutique status to STATUS_LABELS
content = re.sub(r"(returned: '[^']+',)", r"\1\n  boutique: 'En Boutique',", content)

# 2. Add boutique status to STATUS_BADGE
content = re.sub(r"(returned: 'badge-returned',)", r"\1\n  boutique: 'badge-pending',", content)

# 3. Add Store to lucide-react imports
if "Store } from 'lucide-react'" not in content:
    content = content.replace("Edit2 } from 'lucide-react'", "Edit2, Store } from 'lucide-react'")

# 4. Add state for boutique
if "const [showBoutiqueModal, setShowBoutiqueModal]" not in content:
    state_add = '''  const [showTracking, setShowTracking] = useState(false)
  const [mylerzStatusDate, setMylerzStatusDate] = useState(null) // date du dernier statut Mylerz

  // Boutique Transfer State
  const [showBoutiqueModal, setShowBoutiqueModal] = useState(false)
  const [boutiquesList, setBoutiquesList] = useState([])
  const [selectedBoutique, setSelectedBoutique] = useState('')
  const [transferring, setTransferring] = useState(false)'''
    content = content.replace('''  const [showTracking, setShowTracking] = useState(false)\n  const [mylerzStatusDate, setMylerzStatusDate] = useState(null) // date du dernier statut Mylerz''', state_add)

# 5. Add fetchBoutiques inside useEffect
if "fetchBoutiques()" not in content:
    use_eff_add = '''  useEffect(() => {
    fetchDetail()
    fetchBoutiques()
    const t = setInterval(fetchDetail, 60000)
    return () => clearInterval(t)
  }, [id])

  const fetchBoutiques = async () => {
    try {
      const res = await adminClient.get('/admin/boutiques/')
      setBoutiquesList(res.data.filter(b => b.is_active))
    } catch (e) {
      console.error(e)
    }
  }

  const handleTransferBoutique = async () => {
    if (!selectedBoutique) {
      alert('Veuillez sélectionner une boutique.')
      return
    }
    setTransferring(true)
    try {
      await adminClient.post(`/admin/orders/${id}/transfer_to_boutique/`, { boutique_id: selectedBoutique })
      setShowBoutiqueModal(false)
      fetchDetail()
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors du transfert.')
    } finally {
      setTransferring(false)
    }
  }'''

    content = re.sub(r"  useEffect\(\(\) => \{\n    fetchDetail\(\)\n    const t = setInterval\(fetchDetail, 60000\)\n    return \(\) => clearInterval\(t\)\n  \}, \[id\]\)", use_eff_add, content)

# 6. Add boutique button
if "Store size={14}" not in content:
    btn_target = '''           ) : (
             <>
               <button className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, display: 'flex', alignItems: 'center', border: 'none' }} onClick={handleMylerzShip} disabled={mylerzLoading}>
                 EXPÉDIER
               </button>
             </>
           )}'''

    btn_replace = '''           ) : (
             <>
               <button className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, display: 'flex', alignItems: 'center', border: 'none' }} onClick={handleMylerzShip} disabled={mylerzLoading || detail.status === 'boutique'}>
                 EXPÉDIER
               </button>
               {detail.status !== 'boutique' && (
                 <button className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, backgroundColor: '#8b5cf6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowBoutiqueModal(true)}>
                   <Store size={14} /> BOUTIQUE
                 </button>
               )}
             </>
           )}'''
               
    content = content.replace(btn_target, btn_replace)

# 7. Add Modal at the end
if "Boutique Transfer Modal" not in content:
    content_parts = content.rsplit('    </div>\n  )\n}', 1)

    modal_replace = '''
      {/* Boutique Transfer Modal */}
      {showBoutiqueModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Transférer à une Boutique</h3>
              <button className="modal-close" onClick={() => setShowBoutiqueModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-4">
                En transférant cette commande, son statut passera à <strong>En Boutique</strong>. Un email sera envoyé au client pour l'informer que sa commande est prête à être récupérée.
              </p>
              <div className="form-group">
                <label>Sélectionner la boutique</label>
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
    </div>
  )
}'''
    if len(content_parts) == 2:
        content = content_parts[0] + modal_replace

with open('frontend/src/pages/admin/AdminOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
