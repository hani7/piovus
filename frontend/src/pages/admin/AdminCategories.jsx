import { useState, useEffect } from 'react'
import client from '../../api/client'

const EMPTY_FORM = { name: '', order: 0, is_active: true }

export default function AdminCategories() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    client.get('/admin/categories/?page_size=100')
      .then(r => setCats(r.data.results || r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null); setImgFile(null); setImgPreview(null); setModal('add')
  }

  const openEdit = (c) => {
    setForm({ name: c.name, order: c.order, is_active: c.is_active })
    setEditId(c.id); setImgFile(null); setImgPreview(c.image || null); setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imgFile) fd.append('image', imgFile)
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (modal === 'add') await client.post('/admin/categories/', fd, cfg)
      else await client.patch(`/admin/categories/${editId}/`, fd, cfg)
      setModal(null); load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return
    await client.delete(`/admin/categories/${id}/`)
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Catégories</h2>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">{cats.length} catégorie{cats.length !== 1 ? 's' : ''}</span>
          <button className="btn-primary" onClick={openAdd} id="add-category-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th><th>Nom</th><th>Slug</th><th>Produits</th><th>Ordre</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.id}>
                    <td>
                      {c.image
                        ? <img src={c.image} alt={c.name} />
                        : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--admin-surface2)' }} />
                      }
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{c.slug}</td>
                    <td style={{ fontWeight: 600 }}>{c.product_count}</td>
                    <td style={{ color: 'var(--admin-text-muted)' }}>{c.order}</td>
                    <td><span className={`badge ${c.is_active ? 'badge-active' : 'badge-inactive'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-edit" onClick={() => openEdit(c)}>Modifier</button>
                        <button className="btn-danger" onClick={() => handleDelete(c.id)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cats.length === 0 && (
                  <tr><td colSpan={7}><div className="admin-empty"><p>Aucune catégorie.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <span className="admin-modal-title">{modal === 'add' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}</span>
              <button className="btn-icon" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="admin-modal-body">
                <div className="form-group">
                  <label>Image</label>
                  {imgPreview && <img src={imgPreview} className="thumb-preview" alt="preview" />}
                  <label className="form-file-label" htmlFor="cat-img-upload">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
                    {imgPreview ? 'Changer l\'image' : 'Choisir une image'}
                  </label>
                  <input id="cat-img-upload" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files[0]; if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)) } }} />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input className="form-control" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la catégorie" />
                </div>
                <div className="form-group">
                  <label>Ordre d'affichage</label>
                  <input className="form-control" type="number" min="0" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
                </div>
                <label className="form-check">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Catégorie active
                </label>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
