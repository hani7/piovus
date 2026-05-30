import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import './admin.css'

export default function AdminBlacklist() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBlacklist()
  }, [])

  const fetchBlacklist = async () => {
    setLoading(true)
    try {
      const res = await adminClient.get('/admin/customers/?is_blacklisted=true')
      setCustomers(res.data.results || res.data)
      setError(null)
    } catch (err) {
      setError('Erreur lors du chargement de la liste noire.')
    } finally {
      setLoading(false)
    }
  }

  const removeBlacklist = async (customer) => {
    if (!window.confirm('Voulez-vous vraiment retirer ce client de la liste noire ?')) return
    
    try {
      await adminClient.patch(`/admin/customers/${customer.id}/`, {
        is_blacklisted: false
      })
      fetchBlacklist()
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut du client.")
    }
  }

  if (loading && customers.length === 0) return <div className="admin-loading"><div className="spinner" /></div>
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Blacklist</h2>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem', marginTop: 4 }}>
          Les clients dans cette liste verront leurs futures commandes signalées en rouge dans votre tableau de bord.
        </p>
      </div>

      <div className="admin-table-wrap" style={{ borderTop: '4px solid #dc3545' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Date d'ajout</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="6" className="text-center">Aucun client dans la liste noire.</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.name || 'Client Anonyme'}</strong></td>
                  <td>{c.phone}</td>
                  <td>{c.email || '-'}</td>
                  <td>{new Date(c.updated_at).toLocaleDateString('fr-DZ')}</td>
                  <td className="text-right">
                    <button 
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      onClick={() => removeBlacklist(c)}
                    >
                      Retirer de la liste
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
