import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import adminClient from '../../api/adminClient'
import './admin.css'

const DISCOUNT_TYPES = {
  percentage: 'Pourcentage (%)',
  fixed: 'Montant fixe (DA)',
  bogo: 'Achetez X, Obtenez Y (BOGO)'
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    buy_quantity: '',
    get_quantity: '',
    min_order_value: '',
    usage_limit: '',
    start_date: '',
    end_date: '',
    is_active: true
  })

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const res = await adminClient.get('/admin/coupons/')
      setCoupons(res.data.results || res.data)
    } catch (err) {
      console.error(err)
      alert("Erreur de chargement des codes promos.")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (coupon = null) => {
    if (coupon) {
      setEditingId(coupon.id)
      setForm({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value || '',
        buy_quantity: coupon.buy_quantity || '',
        get_quantity: coupon.get_quantity || '',
        min_order_value: coupon.min_order_value || '',
        usage_limit: coupon.usage_limit || '',
        start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : '',
        end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : '',
        is_active: coupon.is_active
      })
    } else {
      setEditingId(null)
      setForm({
        code: '', discount_type: 'percentage', discount_value: '',
        buy_quantity: '', get_quantity: '', min_order_value: '',
        usage_limit: '', start_date: '', end_date: '', is_active: true
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Parse empty strings to null for integers/decimals
    const payload = { ...form }
    const numFields = ['discount_value', 'buy_quantity', 'get_quantity', 'min_order_value', 'usage_limit']
    numFields.forEach(field => {
      if (payload[field] === '') payload[field] = null
    })
    const dateFields = ['start_date', 'end_date']
    dateFields.forEach(field => {
      if (payload[field] === '') payload[field] = null
    })

    try {
      if (editingId) {
        await adminClient.put(`/admin/coupons/${editingId}/`, payload)
      } else {
        await adminClient.post('/admin/coupons/', payload)
      }
      setShowModal(false)
      fetchCoupons()
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'enregistrement du code promo. Vérifiez que le code est unique.")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce code promo ?")) return
    try {
      await adminClient.delete(`/admin/coupons/${id}/`)
      fetchCoupons()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Codes Promotionnels</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Ajouter un Code
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Valeur</th>
              <th>Utilisations</th>
              <th>Statut</th>
              <th align="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucun code promo trouvé.</td></tr>
            ) : (
              coupons.map(coupon => (
                <tr key={coupon.id}>
                  <td><strong>{coupon.code}</strong></td>
                  <td>{DISCOUNT_TYPES[coupon.discount_type]}</td>
                  <td>
                    {coupon.discount_type === 'percentage' && `${parseFloat(coupon.discount_value)}%`}
                    {coupon.discount_type === 'fixed' && `${parseFloat(coupon.discount_value)} DA`}
                    {coupon.discount_type === 'bogo' && `Achetez ${coupon.buy_quantity}, Obtenez ${coupon.get_quantity}`}
                  </td>
                  <td>
                    {coupon.times_used} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : 'utilisations'}
                  </td>
                  <td>
                    <span className={`badge ${coupon.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {coupon.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td align="right">
                    <button className="btn-icon" onClick={() => handleOpenModal(coupon)}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(coupon.id)} style={{ color: 'var(--admin-danger)' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingId ? 'Modifier le Code' : 'Ajouter un Code'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form className="admin-modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Code Promo</label>
                <input required className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="EX: SUMMER2026" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type de remise</label>
                  <select className="form-control" value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}>
                    {Object.entries(DISCOUNT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {form.discount_type !== 'bogo' && (
                  <div className="form-group">
                    <label>Valeur de la remise</label>
                    <input type="number" step="0.01" required className="form-control" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder={form.discount_type === 'percentage' ? '%' : 'DA'} />
                  </div>
                )}
              </div>

              {form.discount_type === 'bogo' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Achetez (Quantité)</label>
                    <input type="number" required className="form-control" value={form.buy_quantity} onChange={e => setForm({...form, buy_quantity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Obtenez (Quantité offerte)</label>
                    <input type="number" required className="form-control" value={form.get_quantity} onChange={e => setForm({...form, get_quantity: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Minimum d'achat (DA)</label>
                  <input type="number" className="form-control" value={form.min_order_value} onChange={e => setForm({...form, min_order_value: e.target.value})} placeholder="Facultatif" />
                </div>
                <div className="form-group">
                  <label>Limite d'utilisations</label>
                  <input type="number" className="form-control" value={form.usage_limit} onChange={e => setForm({...form, usage_limit: e.target.value})} placeholder="Facultatif (ex: 100)" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date de début</label>
                  <input type="datetime-local" className="form-control" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Date de fin</label>
                  <input type="datetime-local" className="form-control" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
                <input type="checkbox" id="coupon_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                <label htmlFor="coupon_active" style={{ marginBottom: 0 }}>Activer ce code</label>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
