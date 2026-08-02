import { useState, useEffect } from 'react'
import { Package, CheckCircle, Clock } from 'lucide-react'
import boutiqueClient from '../../api/boutiqueClient'
import { Link } from 'react-router-dom'

export default function BoutiqueDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    ready: 0,
    collected: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await boutiqueClient.get('/boutique/orders/')
      const orders = res.data
      
      const st = { total: orders.length, pending: 0, ready: 0, collected: 0 }
      orders.forEach(o => {
        if (o.boutique_status === 'pending') st.pending++
        else if (o.boutique_status === 'ready') st.ready++
        else if (o.boutique_status === 'collected') st.collected++
      })
      setStats(st)
      
      // Top 5 recent
      setRecentOrders(orders.slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Chargement du tableau de bord...</div>

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24, color: '#1e293b' }}>Vue d'ensemble</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#e0e7ff', color: '#4338ca', padding: 12, borderRadius: 12 }}><Package size={24} /></div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Total assignées</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#fef3c7', color: '#b45309', padding: 12, borderRadius: 12 }}><Clock size={24} /></div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>En attente / Prêtes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.pending + stats.ready}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#dcfce7', color: '#15803d', padding: 12, borderRadius: 12 }}><CheckCircle size={24} /></div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Récupérées (Terminées)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.collected}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Commandes récentes</h2>
          <Link to="/boutique/orders" style={{ color: '#be123c', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>Voir tout &rarr;</Link>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>CMD</th>
                <th style={{ padding: '12px 16px' }}>Client</th>
                <th style={{ padding: '12px 16px' }}>Total</th>
                <th style={{ padding: '12px 16px' }}>Statut Boutique</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Aucune commande récente.</td></tr>
              ) : recentOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>#{o.id}</td>
                  <td style={{ padding: '12px 16px' }}>{o.guest_name}<br/><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{o.guest_phone}</span></td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{Number(o.total)} DA</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                      background: o.boutique_status === 'collected' ? '#dcfce7' : (o.boutique_status === 'ready' ? '#dbeafe' : '#fef3c7'),
                      color: o.boutique_status === 'collected' ? '#15803d' : (o.boutique_status === 'ready' ? '#1d4ed8' : '#b45309')
                    }}>
                      {o.boutique_status_display}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(o.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
