import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import './admin.css'

const EMPTY_FORM = { title: '', subtitle: '', cta_label: 'Découvrir', cta_url: '/shop', promo_code: '', placement: 'hero', category: '', order: 0, is_active: true }

const PLACEMENT_LABELS = {
  'hero': 'Hero Slider (Accueil)',
  'popup': 'Pop-up d\'entrée',
  'home_section_1': 'Bandeau Section 1 (Accueil)',
  'home_section_2': 'Bandeau Section 2 (Accueil)',
  'top_banner': 'Bandeau Supérieur (Global)',
  'category_banner': 'Bandeau Page Catégorie',
  'side_left': 'Bannière Flottante Gauche',
  'side_right': 'Bannière Flottante Droite',
}

export default function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'add' | 'edit' | null
  const [form, setForm] = useState(EMPTY_FORM)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      adminClient.get('/admin/banners/'),
      adminClient.get('/categories/')
    ]).then(([resBanners, resCats]) => {
      setBanners(resBanners.data.results || resBanners.data)
      setCategories(resCats.data.results || resCats.data)
    })
    .catch((err) => console.error(err))
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modal) setModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modal])

  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null); setImgFile(null); setImgPreview(null); setModal('add')
  }

  const openEdit = (b) => {
    setForm({ 
      title: b.title, subtitle: b.subtitle, cta_label: b.cta_label, 
      cta_url: b.cta_url, promo_code: b.promo_code, placement: b.placement || 'hero', 
      category: b.category || '', order: b.order, is_active: b.is_active 
    })
    setEditId(b.id); setImgFile(null); setImgPreview(b.image || null); setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'category' && !v) return // skip empty category
        if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false')
        else fd.append(k, v)
      })
      if (imgFile) fd.append('image', imgFile)
      
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (modal === 'add') await adminClient.post('/admin/banners/', fd, cfg)
      else await adminClient.patch(`/admin/banners/${editId}/`, fd, cfg)
      
      setModal(null); load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette bannière/pop-up ?')) return
    try {
      await adminClient.delete(`/admin/banners/${id}/`)
      load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Bannières & Pop-ups</h2>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/> Ajouter</button>
      </div>

      <div className="admin-card">
        {loading ? <div className="spinner"/> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Titre</th>
                <th>Emplacement</th>
                <th>Actif</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.image ? <img src={b.image} alt={b.title} style={{width: 60, height: 40, objectFit: 'cover', borderRadius: 4}}/> : '-'}
                  </td>
                  <td>
                    <strong>{b.title}</strong>
                    {b.subtitle && <div style={{fontSize: '0.8rem', color: '#666'}}>{b.subtitle}</div>}
                  </td>
                  <td><span className="badge">{PLACEMENT_LABELS[b.placement] || b.placement}</span></td>
                  <td>
                    <span className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {b.is_active ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn-icon" onClick={() => openEdit(b)}><Edit size={16}/></button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(b.id)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && <tr><td colSpan="5" style={{textAlign:'center'}}>Aucun élément trouvé.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <span className="admin-modal-title">{modal === 'add' ? 'Ajouter' : 'Modifier'} un élément</span>
              <button type="button" className="admin-modal-close" onClick={() => setModal(null)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              
              <div className="form-group">
                <label>Emplacement</label>
                <select className="form-input" value={form.placement} onChange={(e) => setForm({...form, placement: e.target.value})}>
                  {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {form.placement === 'category_banner' && (
                <div className="form-group">
                  <label>Catégorie cible</label>
                  <select className="form-input" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                    <option value="">Sélectionnez une catégorie...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Titre</label>
                  <input className="form-input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Sous-titre</label>
                  <input className="form-input" value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bouton (Texte)</label>
                  <input className="form-input" value={form.cta_label} onChange={(e) => setForm({...form, cta_label: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Bouton (Lien)</label>
                  <input className="form-input" value={form.cta_url} onChange={(e) => setForm({...form, cta_url: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Image (Visuel / Background)</label>
                {imgPreview && <img src={imgPreview} alt="preview" style={{width: 100, marginBottom: 10, borderRadius: 4}}/>}
                <input type="file" className="form-input" accept="image/*" onChange={(e) => {
                  const f = e.target.files[0]
                  if (f) {
                    setImgFile(f)
                    setImgPreview(URL.createObjectURL(f))
                  }
                }} />
              </div>

              <div className="form-row" style={{alignItems: 'center'}}>
                <div className="form-group">
                  <label>Ordre d'affichage</label>
                  <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({...form, order: e.target.value})} />
                </div>
                <label className="checkbox-label" style={{marginTop: 15}}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} />
                  Actif (visible sur le site)
                </label>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-accent" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
