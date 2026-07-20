import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import adminClient from '../../api/adminClient'

function Pagination({ page, totalPages, onPage }) {
  const actualTotalPages = Math.max(1, totalPages)
  if (actualTotalPages <= 1) return (
    <div className="admin-pagination">
      <button className="admin-page-btn" disabled>«</button>
      <button className="admin-page-btn active">1</button>
      <button className="admin-page-btn" disabled>»</button>
    </div>
  )
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
  return (
    <div className="admin-pagination">
      <button className="admin-page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>«</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} style={{ color: 'var(--admin-text-muted)', padding: '0 4px' }}>…</span>
          : <button key={p} className={`admin-page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="admin-page-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>»</button>
    </div>
  )
}

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmé',
  shipped: 'En livraison', fulfilled: 'Livrée', cancelled: 'Annulée', returned: 'Retournée',
}

const STATUS_BADGE = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  shipped: 'badge-shipped', fulfilled: 'badge-fulfilled', cancelled: 'badge-cancelled', returned: 'badge-returned',
}

export default function AdminOrderHistory({ isB2B = false }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [deletedFilter, setDeletedFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter) params.append('status', filter)
    if (paymentFilter) params.append('payment_status', paymentFilter)
    if (deletedFilter) params.append('is_deleted', deletedFilter)
    if (search) params.append('search', search)
    if (isB2B) params.append('customer__is_b2b', 'true')
    params.append('page', page)
    params.append('page_size', perPage)
    
    adminClient.get(`/admin/orders-history/?${params}`)
      .then(r => setOrders(r.data.results || r.data))
      .catch(err => {
        console.error('Erreur chargement historique:', err)
        setOrders([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { 
    setPage(1)
    load() 
  }, [filter, paymentFilter, deletedFilter, search, isB2B])
  
  useEffect(() => { 
    if (page !== 1) load() 
  }, [page, perPage])

  return (
    <div>
      <div className="admin-page-header">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          Historique Complet des Commandes {isB2B ? 'B2B' : ''}
          {!loading && (
            <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--admin-text-muted)', marginLeft: 10 }}>
              {orders.length} commande{orders.length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={load}>
              <RefreshCw size={14}/> Rafraîchir
            </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Recherche ID, client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                id="orders-search"
              />
            </div>
            <select
              className="admin-filter-select"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              className="admin-filter-select"
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
            >
              <option value="">Paiement: Tous</option>
              <option value="unpaid">Non payé</option>
              <option value="paid">Payé</option>
              <option value="refunded">Remboursé</option>
            </select>
            <select
              className="admin-filter-select"
              value={deletedFilter}
              onChange={e => setDeletedFilter(e.target.value)}
            >
              <option value="">Archivage: Tout</option>
              <option value="false">Actives seulement</option>
              <option value="true">Supprimées (Corbeille)</option>
            </select>
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
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Client</th><th>Contact</th><th>Wilaya</th>
                    <th>Total</th><th>Statut</th><th>Archive</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                  <tr key={o.id} style={{ ...(o.is_deleted ? { background: '#f8fafc', opacity: 0.8 } : {}) }}>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      #{o.id}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {o.customer_name}
                      {o.is_deleted && <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: 2, fontWeight: 700 }}>SUPPRIMÉE</div>}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
                      {o.guest_phone || '—'}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{o.wilaya || '—'}</td>
                    <td style={{ fontWeight: 700, color: o.is_deleted ? 'var(--admin-text-muted)' : 'var(--color-black)' }}>
                      {Number(o.total).toLocaleString('fr-DZ')} DA
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[o.status]}`} style={{ fontSize: '0.65rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        {o.is_deleted ? (
                           <>
                             <span style={{ color: '#ef4444', fontWeight: 600 }}>Archivée</span><br/>
                             par {o.deleted_by_name || 'Inconnu'}<br/>
                             le {new Date(o.deleted_at).toLocaleDateString('fr-DZ')}
                           </>
                        ) : 'Active'}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '6px', background: '#f1f5f9', borderRadius: '50%', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }} 
                          onClick={() => navigate(`/piove-secure-2026/orders/${o.id}`)} 
                          title="Détails"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={10}><div className="admin-empty"><p>Aucune commande trouvée.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
              <Pagination page={page} totalPages={Math.ceil((orders[0]?.count || orders.length) / perPage)} onPage={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
