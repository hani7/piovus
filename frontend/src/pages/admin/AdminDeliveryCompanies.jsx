import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import adminClient from '../../api/adminClient'
import './admin.css'

export default function AdminDeliveryCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', is_active: true })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modal) setModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modal])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const res = await adminClient.get('/delivery-companies/')
      setCompanies(res.data)
      setError(null)
    } catch (err) {
      setError('Erreur lors du chargement des transporteurs.')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setForm({ name: '', is_active: true })
    setEditId(null)
    setModal('add')
  }

  const openEdit = (c) => {
    setForm({ name: c.name, is_active: c.is_active })
    setEditId(c.id)
    setModal('edit')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await adminClient.patch(`/delivery-companies/${editId}/`, form)
      } else {
        await adminClient.post('/delivery-companies/', form)
      }
      setModal(null)
      fetchCompanies()
    } catch (err) {
      alert("Une erreur est survenue lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce transporteur ?')) return
    try {
      await adminClient.delete(`/delivery-companies/${id}/`)
      fetchCompanies()
    } catch (err) {
      alert('Erreur lors de la suppression.')
    }
  }

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Transporteurs</h2>
        <button className="btn btn-accent" onClick={openAdd}>
          <Plus size={18} /> Ajouter un transporteur
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom du transporteur</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan="4" className="text-center">Aucun transporteur trouvé.</td></tr>
            ) : (
              companies.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {c.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-icon" onClick={() => openEdit(c)} title="Modifier"><Edit size={18}/></button>
                    <button className="btn-icon" onClick={() => handleDelete(c.id)} title="Supprimer"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>{modal === 'add' ? 'Ajouter un transporteur' : 'Modifier le transporteur'}</h3>
              <button type="button" className="admin-modal-close" onClick={() => setModal(null)}><X size={20}/></button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nom du transporteur</label>
                  <input
                    className="form-control"
                    required
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Ex: Yalidine Express"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={e => setForm({...form, is_active: e.target.checked})}
                  />
                  <label htmlFor="is_active" style={{ marginBottom: 0 }}>Actif</label>
                </div>
                <div className="admin-modal-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Annuler</button>
                  <button type="submit" className="btn btn-accent" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
