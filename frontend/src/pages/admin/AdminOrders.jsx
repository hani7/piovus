import { useState, useEffect } from 'react'
import client from '../../api/client'

const PER_PAGE = 20

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

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmée',
  shipped: 'En livraison', delivered: 'Livrée', cancelled: 'Annulée',
}

const STATUS_BADGE = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  shipped: 'badge-shipped', delivered: 'badge-delivered', cancelled: 'badge-cancelled',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    setPage(1)
    const params = new URLSearchParams()
    if (filter) params.append('status', filter)
    if (search) params.append('search', search)
    params.append('page_size', 500)
    client.get(`/admin/orders/?${params}`)
      .then(r => setOrders(r.data.results || r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter, search])

  const handleStatus = async (id, newStatus) => {
    await client.patch(`/admin/orders/${id}/`, { status: newStatus })
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Commandes</h2>

      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Nom, téléphone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                id="orders-search"
              />
            </div>
            <select
              className="admin-filter-select"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              id="orders-filter"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            {orders.length} commande{orders.length !== 1 ? 's' : ''}
          </span>
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
                    <th>Total</th><th>Articles</th><th>Statut</th><th>Date</th><th>Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(o => (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>#{o.id}</td>
                    <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
                      {o.guest_phone || (o.user ? '—' : '—')}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{o.wilaya || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{Number(o.total).toLocaleString('fr-DZ')} DA</td>
                    <td>{o.items?.length || 0}</td>
                    <td>
                      <select
                        className="status-select"
                        value={o.status}
                        onChange={e => handleStatus(o.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      {new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button className="btn-edit" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={() => setDetail(o)}>
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={9}><div className="admin-empty"><p>Aucune commande.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(orders.length / PER_PAGE)} onPage={setPage} />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="admin-modal" style={{ maxWidth: 640 }}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Commande #{detail.id}</span>
              <button className="btn-icon" onClick={() => setDetail(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="admin-modal-body">
              {/* Client info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>CLIENT</div>
                  <div style={{ fontWeight: 600 }}>{detail.customer_name}</div>
                  {detail.guest_phone && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{detail.guest_phone}</div>}
                  {detail.guest_email && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{detail.guest_email}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>LIVRAISON</div>
                  <div style={{ fontSize: '0.9rem' }}>{detail.shipping_address}</div>
                  {detail.wilaya && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{detail.wilaya} — {detail.city}</div>}
                </div>
              </div>

              {/* Items */}
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Articles</div>
              <div style={{ background: 'var(--admin-surface2)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {detail.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--admin-border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.product_name}</div>
                      {item.variant_name && <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{item.variant_name}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>{item.quantity} × {Number(item.price_at_purchase).toLocaleString('fr-DZ')} DA</div>
                      <div style={{ fontWeight: 600 }}>{Number(item.subtotal).toLocaleString('fr-DZ')} DA</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${STATUS_BADGE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Total: {Number(detail.total).toLocaleString('fr-DZ')} DA
                </div>
              </div>

              {detail.notes && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--admin-surface2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                  <strong>Notes:</strong> {detail.notes}
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
