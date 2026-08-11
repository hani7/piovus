import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, MapPin, Phone, User, Activity } from 'lucide-react'
import adminClient from '../../api/adminClient'
import wilayasData from '../../../public/wilayas.json'

export default function AdminBoutiques() {
  const [boutiques, setBoutiques] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    wilaya: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    is_active: true
  })

  useEffect(() => {
    fetchBoutiques()
  }, [])

  const fetchBoutiques = async () => {
    try {
      const res = await adminClient.get('/admin/boutiques/')
      const data = res.data.results || res.data
      if (Array.isArray(data)) {
        setBoutiques(data)
      } else {
        setBoutiques([])
      }
    } catch (err) {
      console.error(err)
      setBoutiques([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (b = null) => {
    if (b) {
      setEditItem(b)
      setFormData({
        name: b.name,
        address: b.address,
        wilaya: b.wilaya,
        phone: b.phone,
        email: b.email || '',
        username: b.username || '',
        password: '', // Leave blank when editing
        is_active: b.is_active
      })
    } else {
      setEditItem(null)
      setFormData({
        name: '', address: '', wilaya: '', phone: '', email: '', username: '', password: '', is_active: true
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await adminClient.patch(`/admin/boutiques/${editItem.id}/`, formData)
      } else {
        await adminClient.post('/admin/boutiques/', formData)
      }
      setShowModal(false)
      fetchBoutiques()
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur lors de l'enregistrement.")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette boutique ? L'utilisateur associé sera également supprimé.")) return
    try {
      await adminClient.delete(`/admin/boutiques/${id}/`)
      fetchBoutiques()
    } catch (err) {
      alert("Erreur lors de la suppression.")
    }
  }

  if (loading) return <div className="admin-loading">Chargement...</div>

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Gestion des Boutiques</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Ajouter une boutique
        </button>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Contact & Adresse</th>
              <th>Compte Utilisateur</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {boutiques.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-muted">Aucune boutique enregistrée.</td></tr>
            ) : boutiques.map(b => (
              <tr key={b.id}>
                <td><strong>{b.name}</strong></td>
                <td>
                  <div className="text-sm text-muted flex items-center gap-1"><MapPin size={14}/> {b.wilaya} - {b.address}</div>
                  <div className="text-sm text-muted flex items-center gap-1"><Phone size={14}/> {b.phone || '-'}</div>
                </td>
                <td>
                  <span className="badge badge-outline"><User size={12} className="mr-1" /> {b.username}</span>
                </td>
                <td>
                  <span className={`badge ${b.is_active ? 'badge-success' : 'badge-error'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-right">
                  <button className="btn-icon text-muted hover:text-primary" onClick={() => handleOpenModal(b)}>
                    <Edit size={18} />
                  </button>
                  <button className="btn-icon text-muted hover:text-error ml-2" onClick={() => handleDelete(b.id)}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="admin-modal-content" style={{ maxWidth: '550px', width: '90%', background: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', color: '#1e293b' }}>
            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{editItem ? 'Modifier la boutique' : 'Ajouter une boutique'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                <div className="form-group">
                  <label>Nom de la boutique *</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Wilaya</label>
                    <input list="wilayas-list" className="form-control" placeholder="Rechercher une wilaya..." value={formData.wilaya} onChange={e => setFormData({...formData, wilaya: e.target.value})} />
                    <datalist id="wilayas-list">
                      {wilayasData.map(w => (
                        <option key={w.code} value={`${w.code} - ${w.name}`} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adresse détaillée</label>
                  <textarea className="form-control" rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                <h4 className="mt-4 mb-2 text-sm font-semibold uppercase text-muted">Compte de connexion</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nom d'utilisateur {editItem ? '(non modifiable)' : '*'}</label>
                    <input type="text" className="form-control" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required disabled={!!editItem} />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe {editItem ? '(laisser vide pour ne pas changer)' : '*'}</label>
                    <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editItem} />
                  </div>
                </div>
                
                <div className="form-group mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    Boutique active
                  </label>
                </div>
              </div>
              <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
