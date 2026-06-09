import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import './admin.css'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [filterType, setFilterType] = useState('all') // all, retail, b2b
  const [segment, setSegment] = useState('') // '', high_spenders, frequent_returners, inactive_30d

  const [profileModalId, setProfileModalId] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    fetchCustomers(searchTerm, filterType, segment)
  }, [filterType, segment])

  const fetchCustomers = async (search = '', filter = 'all', seg = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filter === 'b2b') params.append('is_b2b', 'true')
      if (filter === 'retail') params.append('is_b2b', 'false')
      if (seg) params.append('segment', seg)

      const res = await adminClient.get(`/admin/customers/?${params.toString()}`)
      // Remove pagination class if it was applied, assuming results array if present
      setCustomers(res.data.results || res.data)
      setError(null)
    } catch (err) {
      setError('Erreur lors du chargement des clients.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCustomers(searchTerm, filterType, segment)
  }

  const openProfile = async (customer) => {
    setProfileModalId(customer.id)
    setProfileLoading(true)
    try {
      const res = await adminClient.get(`/admin/customers/${customer.id}/customer_profile_details/`)
      setProfileData({ ...customer, ...res.data })
    } catch (err) {
      alert("Erreur lors du chargement du profil.")
    } finally {
      setProfileLoading(false)
    }
  }

  const toggleBlacklist = async (customer) => {
    const action = customer.is_blacklisted ? 'retirer de' : 'ajouter à'
    if (!window.confirm(`Voulez-vous vraiment ${action} la liste noire ce client ?`)) return
    
    try {
      await adminClient.patch(`/admin/customers/${customer.id}/`, {
        is_blacklisted: !customer.is_blacklisted
      })
      fetchCustomers(searchTerm, filterType)
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut du client.")
    }
  }



  if (loading && customers.length === 0) return <div className="admin-loading"><div className="spinner" /></div>
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Tous les clients</h2>
      </div>

      <div className="admin-toolbar" style={{ marginBottom: 12 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher par nom, tél ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
          />
          <select 
            className="form-control" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="all">Tous les clients</option>
            <option value="retail">Clients (Détail)</option>
            <option value="b2b">Clients B2B</option>
          </select>
          <button type="submit" className="btn btn-outline">Rechercher</button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button 
          className={`btn ${segment === '' ? 'btn-primary' : 'btn-outline'}`} 
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          onClick={() => setSegment('')}
        >Tous</button>
        <button 
          className={`btn ${segment === 'high_spenders' ? 'btn-primary' : 'btn-outline'}`} 
          style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: segment === 'high_spenders' ? '' : '#10b981', color: segment === 'high_spenders' ? '#fff' : '#10b981', background: segment === 'high_spenders' ? '#10b981' : 'transparent' }}
          onClick={() => setSegment('high_spenders')}
        >💎 Top Acheteurs (High Spenders)</button>
        <button 
          className={`btn ${segment === 'frequent_returners' ? 'btn-primary' : 'btn-outline'}`} 
          style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: segment === 'frequent_returners' ? '' : '#f59e0b', color: segment === 'frequent_returners' ? '#fff' : '#f59e0b', background: segment === 'frequent_returners' ? '#f59e0b' : 'transparent' }}
          onClick={() => setSegment('frequent_returners')}
        >⚠️ Retours fréquents (Annulations)</button>
        <button 
          className={`btn ${segment === 'inactive_30d' ? 'btn-primary' : 'btn-outline'}`} 
          style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: segment === 'inactive_30d' ? '' : '#64748b', color: segment === 'inactive_30d' ? '#fff' : '#64748b', background: segment === 'inactive_30d' ? '#64748b' : 'transparent' }}
          onClick={() => setSegment('inactive_30d')}
        >💤 Inactifs (30 jours)</button>
        <button 
          className={`btn ${segment === 'blacklisted' ? 'btn-primary' : 'btn-outline'}`} 
          style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: segment === 'blacklisted' ? '' : '#dc2626', color: segment === 'blacklisted' ? '#fff' : '#dc2626', background: segment === 'blacklisted' ? '#dc2626' : 'transparent' }}
          onClick={() => setSegment('blacklisted')}
        >🚫 Blacklisté</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Commandes</th>
              <th>Total dépensé</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="8" className="text-center">Aucun client trouvé.</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.name || 'Client Anonyme'}</strong></td>
                  <td>{c.phone}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.total_orders}</td>
                  <td style={{ fontWeight: 600, color: 'var(--admin-success)' }}>{Number(c.total_spent).toLocaleString('fr-DZ')} DA</td>
                  <td>
                    {c.is_blacklisted ? (
                      <span className="badge badge-danger">Blacklisté</span>
                    ) : c.is_b2b ? (
                      <span className="badge badge-info" style={{ background: 'var(--admin-gold)', color: '#fff' }}>B2B (Grossiste)</span>
                    ) : (
                      <span className="badge badge-success">Actif</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-icon" 
                        style={{ padding: '4px', background: '#f1f5f9', borderRadius: 4, color: '#2563eb' }} 
                        onClick={() => openProfile(c)} 
                        title="Profil complet"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button 
                        className="btn-icon" 
                        style={{ padding: '4px', background: c.is_blacklisted ? '#f1f5f9' : '#fef2f2', borderRadius: 4, color: c.is_blacklisted ? '#64748b' : '#dc2626' }} 
                        onClick={() => toggleBlacklist(c)} 
                        title={c.is_blacklisted ? 'Retirer Blacklist' : 'Mettre en Blacklist'}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {profileModalId && (
        <div className="admin-modal-overlay" onClick={() => setProfileModalId(null)}>
          <div className="admin-modal" style={{ maxWidth: 800, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Profil de {profileData?.name || 'Client #' + profileModalId}</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setProfileModalId(null)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              {profileLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Chargement du profil...</div>
              ) : profileData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ background: 'var(--admin-surface2)', padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>Informations de contact</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{profileData.name || 'Anonyme'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: 4 }}>📞 {profileData.phone || '—'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: 4 }}>✉️ {profileData.email || '—'}</div>
                      {profileData.is_b2b && <div style={{ marginTop: 8 }}><span className="badge badge-info" style={{ background: 'var(--admin-gold)', color: '#fff' }}>B2B</span></div>}
                    </div>
                    <div style={{ background: 'var(--admin-surface2)', padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>Total Lifetime Value (LTV)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--admin-success)' }}>{Number(profileData.ltv).toLocaleString('fr-DZ')} DA</div>
                    </div>
                    <div style={{ background: 'var(--admin-surface2)', padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>Total Commandes</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profileData.total_orders}</div>
                    </div>
                  </div>

                  {profileData.saved_addresses?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Adresses de livraison sauvegardées</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {profileData.saved_addresses.map((addr, i) => (
                          <li key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                            📍 {addr}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Historique des commandes ({profileData.order_history?.length || 0})</h4>
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: 8 }}>
                      <table className="admin-table" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--admin-surface)', zIndex: 1 }}>
                          <tr>
                            <th>Date</th>
                            <th>ID</th>
                            <th>Total</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileData.order_history?.map(o => (
                            <tr key={o.id}>
                              <td>{new Date(o.created_at).toLocaleDateString('fr-DZ')}</td>
                              <td>#{o.id}</td>
                              <td style={{ fontWeight: 600 }}>{Number(o.total).toLocaleString('fr-DZ')} DA</td>
                              <td>{o.status_display}</td>
                            </tr>
                          ))}
                          {(!profileData.order_history || profileData.order_history.length === 0) && (
                            <tr><td colSpan="4" style={{ textAlign: 'center' }}>Aucune commande.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'red' }}>Erreur de chargement.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
