import { useState, useEffect } from 'react'
import client from '../../api/client'

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

const STATUS_BADGE = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled',
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/admin/dashboard/')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
  )
  if (!data) return <div className="admin-empty"><p>Impossible de charger le tableau de bord.</p></div>

  const stats = [
    {
      label: 'Commandes totales',
      value: data.total_orders,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
      color: '#6a9ff0',
      colorBg: 'rgba(106,159,240,0.12)',
    },
    {
      label: 'En attente',
      value: data.pending_orders,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      color: '#f0b86a',
      colorBg: 'rgba(240,184,106,0.12)',
    },
    {
      label: 'Chiffre d\'affaires',
      value: data.total_revenue.toLocaleString('fr-DZ', { minimumFractionDigits: 0 }) + ' DA',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      color: '#5ec98e',
      colorBg: 'rgba(94,201,142,0.12)',
    },
    {
      label: 'Produits actifs',
      value: data.active_products,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
      color: '#c9a96e',
      colorBg: 'rgba(201,169,110,0.12)',
    },
    {
      label: 'Catégories',
      value: data.total_categories,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
      color: '#e8a0b4',
      colorBg: 'rgba(232,160,180,0.12)',
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
        Tableau de bord
      </h2>

      {/* Stats */}
      <div className="admin-stats-grid">
        {stats.map(s => (
          <div
            key={s.label}
            className="admin-stat-card"
            style={{ '--stat-color': s.color, '--stat-color-bg': s.colorBg }}
          >
            <div className="admin-stat-icon">{s.icon}</div>
            <div className="admin-stat-value">{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown + Recent orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Status breakdown */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Statut des commandes</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {Object.entries(data.status_counts).map(([s, count]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge ${STATUS_BADGE[s]}`}>{STATUS_LABELS[s]}</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Commandes récentes</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>#{o.id}</td>
                    <td>{o.customer_name}</td>
                    <td style={{ fontWeight: 600 }}>{Number(o.total).toLocaleString('fr-DZ')} DA</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status_display}</span></td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      {new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
                {data.recent_orders.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '32px' }}>Aucune commande</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
