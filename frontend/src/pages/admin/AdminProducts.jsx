import { useState, useEffect, useRef } from 'react'
import { X, Edit, Trash2 } from 'lucide-react'
import adminClient from '../../api/adminClient'

const EMPTY_FORM = {
  name: '', category: '', description: '', price: '',
  promo_price: '', b2b_price: '', stock: '', min_stock_alert: 5, is_featured: false, is_new: false, is_bestseller: false, is_promotion: false, is_active: true,
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="admin-pagination">
      <button className="admin-page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} style={{ color: 'var(--admin-text-muted)', padding: '0 4px' }}>…</span>
          : <button key={p} className={`admin-page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="admin-page-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showVariants, setShowVariants] = useState(false)
  const [variants, setVariants] = useState([])
  const [newVariant, setNewVariant] = useState({ name: '', color_hex: '#000000', stock: 10 })
  const [variantFile, setVariantFile] = useState(null)
  const [editVariantId, setEditVariantId] = useState(null)

  const [showGallery, setShowGallery] = useState(false)
  const [gallery, setGallery] = useState([])
  const [galleryImageFile, setGalleryImageFile] = useState(null)
  const [galleryVideoFile, setGalleryVideoFile] = useState(null)

  const [spreadsheetMode, setSpreadsheetMode] = useState(false)
  const [modifiedProducts, setModifiedProducts] = useState({})
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const fileRef = useRef()
  const variantFileRef = useRef()
  const variantFormRef = useRef()
  const galleryImageRef = useRef()
  const galleryVideoRef = useRef()

  const load = () => {
    setLoading(true)
    Promise.all([
      adminClient.get('/admin/products/?page_size=500'),
      adminClient.get('/admin/categories/?page_size=100'),
    ]).then(([p, c]) => {
      setProducts(p.data.results || p.data)
      setCategories(c.data.results || c.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modal) setModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modal])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null); setThumbFile(null); setThumbPreview(null); setModal('add')
  }

  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category || '',
      description: p.description || '',
      price: p.price, promo_price: p.promo_price || '', b2b_price: p.b2b_price || '',
      stock: p.stock, min_stock_alert: p.min_stock_alert,
      is_featured: p.is_featured, is_new: p.is_new, is_bestseller: p.is_bestseller, is_promotion: p.is_promotion, is_active: p.is_active,
    })
    setEditId(p.id); setThumbFile(null); setThumbPreview(p.thumbnail || null); setModal('edit')
    setVariants(p.variants || [])
    setShowVariants(false)
    setGallery(p.images || [])
    setShowGallery(false)
  }

  const handleThumb = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })
      if (thumbFile) fd.append('thumbnail', thumbFile)
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (modal === 'add') await adminClient.post('/admin/products/', fd, cfg)
      else await adminClient.patch(`/admin/products/${editId}/`, fd, cfg)
      setModal(null); load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return
    await adminClient.delete(`/admin/products/${id}/`)
    load()
  }

  const handleBulkSave = async () => {
    const productsToUpdate = Object.values(modifiedProducts)
    if (productsToUpdate.length === 0) return
    setSaving(true)
    try {
      await adminClient.patch('/admin/products/bulk_update/', { products: productsToUpdate })
      setModifiedProducts({})
      setSpreadsheetMode(false)
      load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleInlineChange = (id, field, value) => {
    setModifiedProducts(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { id }),
        [field]: value
      }
    }))
  }

  const openEditVariant = (v) => {
    setEditVariantId(v.id)
    setNewVariant({ name: v.name, color_hex: v.color_hex || '#000000', stock: v.stock })
    setVariantFile(null)
    setTimeout(() => {
      if (variantFormRef.current) {
        variantFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        // Optionally focus the name input
        const input = variantFormRef.current.querySelector('input')
        if (input) input.focus()
      }
    }, 50)
  }

  const cancelEditVariant = () => {
    setEditVariantId(null)
    setNewVariant({ name: '', color_hex: '#000000', stock: 10 })
    setVariantFile(null)
    if (variantFileRef.current) variantFileRef.current.value = ''
  }

  const handleSaveVariant = async (e) => {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('product', editId)
      fd.append('name', newVariant.name)
      fd.append('color_hex', newVariant.color_hex)
      fd.append('stock', newVariant.stock)
      if (variantFile) fd.append('image', variantFile)
      
      if (editVariantId) {
        const res = await adminClient.patch(`/admin/variants/${editVariantId}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setVariants(variants.map(v => v.id === editVariantId ? res.data : v))
      } else {
        const res = await adminClient.post('/admin/variants/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setVariants([...variants, res.data])
      }
      cancelEditVariant()
      load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDeleteVariant = async (vid) => {
    if (!window.confirm('Supprimer cette variation ?')) return
    await adminClient.delete(`/admin/variants/${vid}/`)
    setVariants(variants.filter(v => v.id !== vid))
    load()
  }

  const handleSaveGallery = async () => {
    if (!editId || !galleryImageFile) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('product', editId)
      fd.append('image', galleryImageFile)
      if (galleryVideoFile) fd.append('video', galleryVideoFile)
      
      const res = await adminClient.post('/admin/images/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setGallery([...gallery, res.data])
      
      setGalleryImageFile(null)
      setGalleryVideoFile(null)
      if (galleryImageRef.current) galleryImageRef.current.value = ''
      if (galleryVideoRef.current) galleryVideoRef.current.value = ''
      load()
    } catch (err) {
      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
    } finally { setSaving(false) }
  }

  const handleDeleteGallery = async (id) => {
    if (!window.confirm('Supprimer ce média ?')) return
    await adminClient.delete(`/admin/images/${id}/`)
    setGallery(gallery.filter(g => g.id !== id))
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
        Produits
        <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--admin-text-muted)', marginLeft: 10 }}>
          {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
        </span>
      </h2>

      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                id="products-search"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
              Afficher
              <select 
                className="form-control" 
                style={{ width: 'auto', padding: '4px 24px 4px 12px', fontSize: '0.85rem', height: '32px' }}
                value={perPage} 
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              par page
            </div>

            <div className="toggle-wrap" style={{ marginLeft: '16px' }}>
              <label className="toggle">
                <input type="checkbox" checked={spreadsheetMode} onChange={e => {
                  setSpreadsheetMode(e.target.checked)
                  if (!e.target.checked) setModifiedProducts({})
                }} />
                <span className="toggle-slider" />
              </label>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--admin-text-muted)' }}>Mode Édition Rapide</span>
            </div>
            {Object.keys(modifiedProducts).length > 0 && (
              <button className="btn-primary" onClick={handleBulkSave} disabled={saving} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
              </button>
            )}
          </div>
          <button className="btn-primary" onClick={openAdd} id="add-product-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th><th>Nom</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Statut</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr key={p.id}>
                      <td>
                        {p.thumbnail
                          ? <img src={p.thumbnail} alt={p.name} />
                          : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--admin-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" style={{ color: 'var(--admin-text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                        }
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ color: 'var(--admin-text-muted)' }}>{p.category_name || '—'}</td>
                      <td>
                        {spreadsheetMode ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input type="number" className={`spreadsheet-input ${modifiedProducts[p.id]?.price !== undefined ? 'changed' : ''}`} value={modifiedProducts[p.id]?.price ?? p.price} onChange={e => handleInlineChange(p.id, 'price', e.target.value)} placeholder="Prix" />
                            {p.is_promo && <input type="number" className={`spreadsheet-input ${modifiedProducts[p.id]?.promo_price !== undefined ? 'changed' : ''}`} value={modifiedProducts[p.id]?.promo_price ?? (p.promo_price || '')} onChange={e => handleInlineChange(p.id, 'promo_price', e.target.value)} placeholder="Promo" />}
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600 }}>{Number(p.price).toLocaleString('fr-DZ')} DA</div>
                            {p.is_promo && <div style={{ fontSize: '0.75rem', color: 'var(--admin-rose)' }}>{Number(p.promo_price).toLocaleString('fr-DZ')} DA promo</div>}
                          </>
                        )}
                      </td>
                      <td>
                        {spreadsheetMode ? (
                          <input type="number" className={`spreadsheet-input ${modifiedProducts[p.id]?.stock !== undefined ? 'changed' : ''}`} value={modifiedProducts[p.id]?.stock ?? p.stock} onChange={e => handleInlineChange(p.id, 'stock', e.target.value)} style={{ width: '80px' }} />
                        ) : (
                          <span style={{ color: p.stock === 0 ? 'var(--admin-danger)' : p.stock <= p.min_stock_alert ? 'var(--admin-warning)' : 'var(--admin-success)', fontWeight: 600 }}>
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td><span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>{p.is_active ? 'Actif' : 'Inactif'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-action-icon" onClick={() => openEdit(p)} title="Modifier">
                            <Edit size={16} />
                          </button>
                          <button className="btn-action-icon" onClick={() => handleDelete(p.id)} title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={7}><div className="admin-empty"><p>Aucun produit trouvé.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <span className="admin-modal-title">{modal === 'add' ? 'Ajouter un produit' : 'Modifier le produit'}</span>
              <button type="button" className="admin-modal-close" onClick={() => setModal(null)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="admin-modal-body">
                <div className="form-group">
                  <label>Image (thumbnail)</label>
                  {thumbPreview && <img src={thumbPreview} className="thumb-preview" alt="preview" />}
                  <label className="form-file-label" htmlFor="thumb-upload">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    {thumbPreview ? "Changer l'image" : 'Choisir une image'}
                  </label>
                  <input id="thumb-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumb} ref={fileRef} />
                </div>

                <div className="form-group">
                  <label>Nom *</label>
                  <input className="form-control" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du produit" />
                </div>

                <div className="form-group">
                  <label>Catégorie</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">— Aucune —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du produit..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Prix (DA) *</label>
                    <input className="form-control" type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Prix promo (DA)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={form.promo_price} onChange={e => setForm(f => ({ ...f, promo_price: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Prix Gros B2B (DA)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_price} onChange={e => setForm(f => ({ ...f, b2b_price: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock</label>
                    <input className="form-control" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Alerte Stock Min</label>
                    <input className="form-control" type="number" min="0" value={form.min_stock_alert} onChange={e => setForm(f => ({ ...f, min_stock_alert: e.target.value }))} placeholder="5" title="Sera affiché en orange (alerte) si le stock descend en dessous" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <label className="form-check">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    Actif
                  </label>
                  <label className="form-check">
                    <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                    Mis en avant
                  </label>
                  <label className="form-check">
                    <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} />
                    Nouveauté
                  </label>
                  <label className="form-check">
                    <input type="checkbox" checked={form.is_bestseller} onChange={e => setForm(f => ({ ...f, is_bestseller: e.target.checked }))} />
                    Best Seller
                  </label>
                  <label className="form-check">
                    <input type="checkbox" checked={form.is_promotion} onChange={e => setForm(f => ({ ...f, is_promotion: e.target.checked }))} />
                    Promotion
                  </label>
                </div>

                {modal === 'edit' && (
                  <div style={{ marginTop: '30px', borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Variations (Teintes / Couleurs)</h3>
                      <button type="button" className="btn-secondary" onClick={() => setShowVariants(!showVariants)}>
                        {showVariants ? 'Masquer' : 'Gérer les variations'}
                      </button>
                    </div>

                    {showVariants && (
                      <div className="variants-section" style={{ background: 'var(--admin-surface2)', padding: '15px', borderRadius: '8px' }}>
                        
                        {/* List existing variants */}
                        {variants.length > 0 ? (
                          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                            {variants.map(v => (
                              <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--admin-surface)', padding: '10px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  {v.image ? (
                                    <img src={v.image} alt={v.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                  ) : (
                                    <div style={{ width: '40px', height: '40px', background: 'var(--admin-border)', borderRadius: '4px' }} />
                                  )}
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: v.color_hex || '#000', border: '1px solid var(--admin-border)' }} title={v.color_hex}></div>
                                  <div style={{ fontWeight: 500 }}>{v.name}</div>
                                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>Stock: {v.stock}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button type="button" className="btn-action-icon" style={{ width: 28, height: 28 }} onClick={() => openEditVariant(v)} title="Modifier">
                                    <Edit size={14} />
                                  </button>
                                  <button type="button" className="btn-action-icon" style={{ width: 28, height: 28 }} onClick={() => handleDeleteVariant(v.id)} title="Supprimer">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--admin-text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Aucune variation pour ce produit.</p>
                        )}

                        {/* Add / Edit new variant */}
                        <div ref={variantFormRef} style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ fontSize: '0.95rem' }}>{editVariantId ? 'Modifier la variation' : 'Ajouter une variation'}</h4>
                            {editVariantId && (
                              <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={cancelEditVariant}>Annuler la modification</button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Nom de la teinte *</label>
                              <input className="form-control" value={newVariant.name} onChange={e => setNewVariant({ ...newVariant, name: e.target.value })} placeholder="Ex: Rouge passion" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Couleur (Hex) *</label>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="color" value={newVariant.color_hex} onChange={e => setNewVariant({ ...newVariant, color_hex: e.target.value })} style={{ width: '40px', height: '40px', padding: '2px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: '4px' }} />
                                <input className="form-control" value={newVariant.color_hex} onChange={e => setNewVariant({ ...newVariant, color_hex: e.target.value })} style={{ flex: 1 }} placeholder="#000000" />
                              </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Stock</label>
                              <input type="number" min="0" className="form-control" value={newVariant.stock} onChange={e => setNewVariant({ ...newVariant, stock: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Image de la variation</label>
                              <input type="file" accept="image/*" className="form-control" style={{ padding: '8px' }} ref={variantFileRef} onChange={e => setVariantFile(e.target.files[0])} />
                            </div>
                          </div>
                          <button type="button" className="btn-primary" style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }} onClick={handleSaveVariant} disabled={!newVariant.name || !newVariant.color_hex || saving}>
                            {saving ? 'Enregistrement...' : editVariantId ? 'Enregistrer la variation' : 'Ajouter cette variation'}
                          </button>
                        </div>

                      </div>
                    )}

                    {/* ── Galerie (Images & Vidéos) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '30px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Galerie (Images & Vidéos)</h3>
                      <button type="button" className="btn-secondary" onClick={() => setShowGallery(!showGallery)}>
                        {showGallery ? 'Masquer' : 'Gérer la galerie'}
                      </button>
                    </div>
                    {showGallery && (
                      <div className="gallery-section" style={{ background: 'var(--admin-surface2)', padding: '15px', borderRadius: '8px' }}>
                        {gallery.length > 0 ? (
                          <div className="gallery-grid">
                            {gallery.map((g, i) => (
                              <div 
                                key={g.id} 
                                className={`gallery-item ${draggedIndex === i ? 'dragging' : ''} ${dragOverIndex === i ? 'drag-over' : ''}`}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'move'
                                  e.dataTransfer.setData('text/plain', i)
                                  setDraggedIndex(i)
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault()
                                  e.dataTransfer.dropEffect = 'move'
                                  setDragOverIndex(i)
                                }}
                                onDragLeave={() => setDragOverIndex(null)}
                                onDragEnd={() => {
                                  setDraggedIndex(null)
                                  setDragOverIndex(null)
                                }}
                                onDrop={async (e) => {
                                  e.preventDefault()
                                  const fromIndex = Number(e.dataTransfer.getData('text/plain'))
                                  const toIndex = i
                                  setDraggedIndex(null)
                                  setDragOverIndex(null)
                                  if (fromIndex !== toIndex) {
                                    const newGallery = [...gallery]
                                    const [moved] = newGallery.splice(fromIndex, 1)
                                    newGallery.splice(toIndex, 0, moved)
                                    setGallery(newGallery)
                                    try {
                                      await adminClient.post('/admin/images/reorder/', {
                                        items: newGallery.map((img, idx) => ({ id: img.id, order: idx }))
                                      })
                                    } catch (err) {
                                      alert('Erreur: ' + JSON.stringify(err.response?.data || err.message))
                                    }
                                  }
                                }}
                              >
                                {i === 0 && <div className="cover-badge">Cover Image</div>}
                                <img src={g.image} alt="galerie" />
                                {g.video && (
                                  <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }}>Vidéo</div>
                                )}
                                <button type="button" className="btn-danger" style={{ position: 'absolute', top: 5, right: 5, padding: '2px 5px', fontSize: '0.7rem' }} onClick={() => handleDeleteGallery(g.id)}>X</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--admin-text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Aucun média dans la galerie.</p>
                        )}
                        <div style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: '15px' }}>
                          <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Ajouter un média</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Image (Miniature/Poster) *</label>
                              <input type="file" accept="image/*" className="form-control" style={{ padding: '8px' }} ref={galleryImageRef} onChange={e => setGalleryImageFile(e.target.files[0])} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Vidéo (Optionnel, MP4)</label>
                              <input type="file" accept="video/mp4,video/webm" className="form-control" style={{ padding: '8px' }} ref={galleryVideoRef} onChange={e => setGalleryVideoFile(e.target.files[0])} />
                            </div>
                          </div>
                          <button type="button" className="btn-primary" style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }} onClick={handleSaveGallery} disabled={!galleryImageFile || saving}>
                            {saving ? 'Ajout en cours...' : 'Ajouter à la galerie'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
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
