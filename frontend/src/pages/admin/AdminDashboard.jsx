import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import adminClient from '../../api/adminClient'
import { useAuthStore } from '../../store/authStore'
import { AlertTriangle, TrendingUp, ShoppingBag, DollarSign, Activity, AlertCircle, ShoppingCart, Users, Clock, Package, Grid } from 'lucide-react'

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  shipped: 'En livraison',
  fulfilled: 'Fulfilled',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

const STATUS_BADGE = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  shipped: 'badge-shipped',
  fulfilled: 'badge-fulfilled',
  cancelled: 'badge-cancelled',
  returned: 'badge-returned',
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminClient.get('/admin/dashboard/')
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
      label: "Chiffre d'affaires (Auj.)",
      value: `${(data.daily_revenue || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 })} DA`,
      icon: <DollarSign size={20} />,
      color: '#5ec98e',
      colorBg: 'rgba(94,201,142,0.12)',
    },
    {
      label: "Chiffre d'affaires (7j)",
      value: `${(data.weekly_revenue || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 })} DA`,
      icon: <TrendingUp size={20} />,
      color: '#3b82f6',
      colorBg: 'rgba(59,130,246,0.12)',
    },
    {
      label: "Commandes (Total)",
      value: data.total_orders || 0,
      icon: <ShoppingBag size={20} />,
      color: '#6a9ff0',
      colorBg: 'rgba(106,159,240,0.12)',
    },
    {
      label: "Panier moyen (AOV)",
      value: `${(data.average_order_value || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} DA`,
      icon: <ShoppingCart size={20} />,
      color: '#f59e0b',
      colorBg: 'rgba(245,158,11,0.12)',
    },
    {
      label: "Taux de conversion",
      value: `${(data.conversion_rate || 0).toFixed(2)} %`,
      icon: <Activity size={20} />,
      color: '#8b5cf6',
      colorBg: 'rgba(139,92,246,0.12)',
    },
    {
      label: "Clients (Total)",
      value: data.total_customers || 0,
      icon: <Users size={20} />,
      color: '#ec4899',
      colorBg: 'rgba(236,72,153,0.12)',
    },
    {
      label: "Commandes (En attente)",
      value: data.pending_orders || 0,
      icon: <Clock size={20} />,
      color: '#ef4444',
      colorBg: 'rgba(239,68,68,0.12)',
    },
    {
      label: "Chiffre d'affaires (Total)",
      value: `${(data.total_revenue || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 })} DA`,
      icon: <DollarSign size={20} />,
      color: '#10b981',
      colorBg: 'rgba(16,185,129,0.12)',
    },
    {
      label: "Produits",
      value: data.total_products || 0,
      icon: <Package size={20} />,
      color: '#8b5cf6',
      colorBg: 'rgba(139,92,246,0.12)',
    },
    {
      label: "Catégories",
      value: data.total_categories || 0,
      icon: <Grid size={20} />,
      color: '#f59e0b',
      colorBg: 'rgba(245,158,11,0.12)',
    },
  ]

  const outOfStock = data.urgent_alerts?.out_of_stock || []
  const fraudOrders = data.urgent_alerts?.fraud_orders || []

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em', color: 'var(--admin-text)' }}>
            Bonjour, {user?.first_name || user?.username || 'Admin'} 👋
          </h2>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
            Voici un aperçu en temps réel de l'activité de votre boutique.
          </p>
        </div>
      </div>

      {/* Real-time Metrics */}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 28 }}>
        
        {/* Urgent Alert Feed */}
        <div className="admin-card" style={{ borderTop: '4px solid var(--admin-danger)' }}>
          <div className="admin-card-header">
            <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--admin-danger)' }}>
              <AlertTriangle size={18} /> Alertes Urgentes
            </span>
          </div>
          <div style={{ padding: '0' }}>
            {outOfStock.length === 0 && fraudOrders.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                Aucune alerte urgente pour le moment.
              </div>
            )}

            {outOfStock.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div style={{ padding: '12px 20px', background: '#fef2f2', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Rupture de stock ({outOfStock.length})
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {outOfStock.map(p => (
                    <li key={`oos-${p.id}`} style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--admin-text)' }}>{p.name}</span>
                      <span className="badge badge-danger">Stock : 0</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fraudOrders.length > 0 && (
              <div>
                <div style={{ padding: '12px 20px', background: '#fffbeb', color: '#92400e', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> Commandes Suspectes / Blacklist ({fraudOrders.length})
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {fraudOrders.map(o => (
                    <li 
                      key={`fraud-${o.id}`} 
                      style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => navigate(`/admin-panel/orders/${o.id}`)}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--admin-text)', marginBottom: 2 }}>{o.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Commande #{o.id} • {Number(o.total).toLocaleString('fr-DZ')} DA</div>
                      </div>
                      <span className="badge badge-warning">À vérifier</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Live Order Ticker */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--admin-success)', animation: 'pulse 2s infinite' }}></div>
              Dernières Commandes
            </span>
            <Link to="/admin-panel/orders" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>Voir tout</Link>
          </div>
          <div style={{ padding: 0 }}>
            {data.recent_orders.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucune commande récente.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.recent_orders.map(o => (
                  <li 
                    key={o.id} 
                    style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => navigate(`/admin-panel/orders/${o.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--admin-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>
                        #{o.id}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text)', marginBottom: 2 }}>{o.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                          {new Date(o.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })} • {o.wilaya || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text)' }}>{Number(o.total).toLocaleString('fr-DZ')} DA</span>
                      <span className={`badge ${STATUS_BADGE[o.status]}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{o.status_display}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {data.trends && data.trends.length > 0 && (
        <div className="admin-card" style={{ marginBottom: 28 }}>
          <div className="admin-card-header">
            <span className="admin-card-title">Évolution du Chiffre d'Affaires (7 derniers jours)</span>
          </div>
          <div style={{ padding: '24px 20px', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cc0000" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#cc0000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} dy={10} tickFormatter={(tick) => {
                  const [y, m, d] = tick.split('-')
                  return `${d}/${m}`
                }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} dx={-10} tickFormatter={(tick) => tick.toLocaleString('fr-DZ')} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--admin-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '0.85rem' }}
                  formatter={(value) => [Number(value).toLocaleString('fr-DZ') + ' DA', 'Chiffre d\'affaires']}
                  labelFormatter={(label) => {
                    const [y, m, d] = label.split('-')
                    return `${d}/${m}/${y}`
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#cc0000" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  )
}
