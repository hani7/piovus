import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import { FileText, Check, X } from 'lucide-react'
import './admin.css'

export default function AdminB2BRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await adminClient.get('/admin/b2b-requests/')
      setRequests(res.data.results || res.data)
      setError(null)
    } catch (err) {
      setError('Erreur lors du chargement des demandes B2B.')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (id) => {
    if (!window.confirm('Voulez-vous vraiment valider ce compte B2B ?')) return
    try {
      await adminClient.post(`/admin/b2b-requests/${id}/validate/`)
      fetchRequests()
    } catch (err) {
      alert("Erreur lors de la validation.")
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Voulez-vous vraiment rejeter cette demande ?')) return
    try {
      await adminClient.post(`/admin/b2b-requests/${id}/reject/`)
      fetchRequests()
    } catch (err) {
      alert("Erreur lors du rejet.")
    }
  }

  if (loading && requests.length === 0) return <div className="admin-loading"><div className="spinner" /></div>
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Demandes B2B en attente</h2>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Entreprise</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>NRC / NIF</th>
              <th>Fichier NRC</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan="8" className="text-center">Aucune demande en attente.</td></tr>
            ) : (
              requests.map(req => {
                const profile = req.profile || {}
                return (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td><strong>{profile.company_name}</strong></td>
                    <td>{req.first_name} {req.last_name}</td>
                    <td>{req.email}</td>
                    <td>{profile.phone}</td>
                    <td>
                      <div>NRC: {profile.nrc}</div>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>NIF: {profile.nif}</div>
                    </td>
                    <td>
                      {profile.nrc_file ? (
                        <a href={profile.nrc_file} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '0.8rem' }}>
                          <FileText size={14} /> Voir le document
                        </a>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.9em' }}>Aucun fichier</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }} onClick={() => handleValidate(req.id)}>
                          <Check size={16} /> Valider
                        </button>
                        <button className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }} onClick={() => handleReject(req.id)}>
                          <X size={16} /> Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
