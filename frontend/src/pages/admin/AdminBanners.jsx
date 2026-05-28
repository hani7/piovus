import { useState, useEffect } from 'react'
import client from '../../api/client'

const EMPTY_FORM = { title: '', subtitle: '', cta_label: 'Découvrir', cta_url: '/shop', promo_code: '', is_active: true, order: 0 }

export default function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    client.get('/admin/banners/?page_size=100')
      .then(r => setBanners(r.data.results || r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null); setImgFile(null); setImgPreview(null); setModal('add')
  }

  const openEdit = (b) => {
    setForm({ title: b.title, subtitle: b.subtitle || '', cta_label: b.cta_label, cta_url: b.cta_url, promo_code: b.promo_code || '', is_active: b.is_active, order: b.order })
    setEditId(b.id); setImgFile(null); setImgPreview(b.image || null); setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imgFile) fd.append('image', imgFile)
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (modal === 'add') await client.post('/admin/banners/', fd, cfg)
      else await client.patch(`/admin/banners/${editId}/`, fd, cfg)
      setModal(null); load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce banner ?')) return
    await client.delete(`/admin/banners/${id}/`)
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Banners</h2>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">{banners.length} banner{banners.length !== 1 ? 's' : ''}</span>
          <button className="btn-primary" onClick={openAdd} id="add-banner-btn">
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
                <tr><th>Image</th><th>Titre</th><th>Sous-titre</th><th>CTA</th><th>Code promo</th><th>Ordre</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {banners.map(b => (
                  <tr key={b.id}>
                    <td>
                      {b.image
                        ? <img src={b.image} alt={b.title} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                        : <div style={{ width: 80, height: 44, borderRadius: 6, background: 'var(--admin-surface2)' }} />
                      }
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.title}</td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subtitle || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--admin-gold)' }}>{b.cta_label}</span>
                      <span style={{ color: 'var(--admin-text-muted)' }}> → {b.cta_url}</span>
                    </td>
                    <td>{b.promo_code ? <span className="badge badge-confirmed">{b.promo_code}</span> : '—'}</td>
                    <td style={{ color: 'var(--admin-text-muted)' }}>{b.order}</td>
                    <td><span className={`badge ${b.is_active ? 'badge-active' : 'badge-inactive'}`}>{b.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-edit" onClick={() => openEdit(b)}>Modifier</button>
                        <button className="btn-danger" onClick={() => handleDelete(b.id)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {banners.length === 0 && (
                  <tr><td colSpan={8}><div className="admin-empty"><p>Aucun banner.</p></div></td></tr>
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
              <span className="admin-modal-title">{modal === 'add' ? 'Ajouter un banner' : 'Modifier le banner'}</span>
              <button className="btn-icon" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="admin-modal-body">
                <div className="form-group">
                  <label>Image du banner</label>
                  {imgPreview && <img src={imgPreview} alt="preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                  <label className="form-file-label" htmlFor="banner-img">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
                    {imgPreview ? 'Changer l\'image' : 'Choisir une image'}
                  </label>
                  <input id="banner-img" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files[0]; if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)) } }} />
                </div>
                <div className="form-group">
                  <label>Titre *</label>
                  <input className="form-control" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre du banner" />
                </div>
                <div className="form-group">
                  <label>Sous-titre</label>
                  <input className="form-control" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Description courte..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Texte du bouton</label>
                    <input className="form-control" value={form.cta_label} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Lien du bouton</label>
                    <input className="form-control" value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="/shop" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Code promo</label>
                    <input className="form-control" value={form.promo_code} onChange={e => setForm(f => ({ ...f, promo_code: e.target.value }))} placeholder="PROMO10" />
                  </div>
                  <div className="form-group">
                    <label>Ordre</label>
                    <input className="form-control" type="number" min="0" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
                  </div>
                </div>
                <label className="form-check">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Banner actif
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
