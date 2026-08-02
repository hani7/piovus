import { useState, useEffect } from 'react'
import { Search, Eye, CheckCircle, Package, XCircle, Clock } from 'lucide-react'
import boutiqueClient from '../../api/boutiqueClient'

export default function BoutiqueOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await boutiqueClient.get('/boutique/orders/')
      const data = res.data.results || res.data
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPickup = async () => {
    setActionLoading(true)
    try {
      await boutiqueClient.post(`/boutique/orders/${selectedOrder.id}/confirm/`)
      setShowConfirmModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      alert("Erreur lors de la confirmation.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkReady = async (id) => {
    try {
      await boutiqueClient.post(`/boutique/orders/${id}/mark_ready/`)
      fetchOrders()
    } catch (e) {
      alert("Erreur.")
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await boutiqueClient.post(`/boutique/orders/${selectedOrder.id}/cancel/`)
      setShowCancelModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      alert("Erreur lors de l'annulation.")
    } finally {
      setActionLoading(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        o.id.toString().includes(searchTerm) ||
                        o.guest_phone?.includes(searchTerm)
    const matchStatus = statusFilter ? o.boutique_status === statusFilter : true
    return matchSearch && matchStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.boutique_status === 'pending').length,
    ready: orders.filter(o => o.boutique_status === 'ready').length,
    collected: orders.filter(o => o.boutique_status === 'collected').length
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24, color: '#1e293b' }}>Gestion des commandes</h1>

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

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Rechercher par ID, nom, téléphone..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#fff', minWidth: 200 }}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente de retrait</option>
            <option value="ready">Prête à retirer</option>
            <option value="collected">Récupérée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textAlign: 'left' }}>
              <th style={{ padding: '16px' }}>CMD</th>
              <th style={{ padding: '16px' }}>Client</th>
              <th style={{ padding: '16px' }}>Produits</th>
              <th style={{ padding: '16px' }}>Total</th>
              <th style={{ padding: '16px' }}>Statut</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>Chargement...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Aucune commande trouvée.</td></tr>
            ) : filteredOrders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px', fontWeight: 600 }}>#{o.id}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.guest_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{o.guest_phone}</div>
                </td>
                <td style={{ padding: '16px', fontSize: '0.85rem', color: '#475569' }}>
                  {o.items?.length} article(s)
                </td>
                <td style={{ padding: '16px', fontWeight: 700 }}>{Number(o.total)} DA</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '6px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    background: o.boutique_status === 'collected' ? '#dcfce7' : (o.boutique_status === 'ready' ? '#dbeafe' : (o.boutique_status === 'cancelled' ? '#fee2e2' : '#fef3c7')),
                    color: o.boutique_status === 'collected' ? '#15803d' : (o.boutique_status === 'ready' ? '#1d4ed8' : (o.boutique_status === 'cancelled' ? '#b91c1c' : '#b45309'))
                  }}>
                    {o.boutique_status_display}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setSelectedOrder(o) }}
                      style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Eye size={14} /> Détails
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Détails Modal */}
      {selectedOrder && !showConfirmModal && !showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                Commande #{selectedOrder.id}
                <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>{new Date(selectedOrder.created_at).toLocaleString('fr-FR')}</span>
              </h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: 1 }}>Client</h4>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{selectedOrder.guest_name}</p>
                  <p style={{ margin: '0 0 4px 0', color: '#475569' }}>{selectedOrder.guest_phone}</p>
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>{selectedOrder.wilaya} - {selectedOrder.city}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: 1 }}>Paiement</h4>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '1.25rem' }}>{Number(selectedOrder.total)} DA</p>
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>{selectedOrder.payment_method === 'cib' ? 'Payé en ligne' : 'À payer sur place (Espèces)'}</p>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#1e293b' }}>Articles ({selectedOrder.items?.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {selectedOrder.items?.map(it => (
                  <li key={it.id} style={{ padding: 12, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{it.product_name}</div>
                      {it.variant_name && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Variante: {it.variant_name}</div>}
                    </div>
                    <div style={{ fontWeight: 600, color: '#be123c' }}>x{it.quantity}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 12px 12px', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {(selectedOrder.boutique_status === 'pending' || selectedOrder.boutique_status === 'ready') && (
                <>
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    style={{ padding: '10px 16px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Annuler la commande
                  </button>
                  {selectedOrder.boutique_status === 'pending' && (
                    <button 
                      onClick={() => handleMarkReady(selectedOrder.id)}
                      style={{ padding: '10px 16px', background: '#fff', color: '#3b82f6', border: '1px solid #93c5fd', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Marquer Prête
                    </button>
                  )}
                  <button 
                    onClick={() => setShowConfirmModal(true)}
                    style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <CheckCircle size={18} /> Confirmer le retrait
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pickup Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem' }}>Confirmer le retrait</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>Avez-vous bien remis la commande <strong>#{selectedOrder?.id}</strong> à <strong>{selectedOrder?.guest_name}</strong> ?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Non, retour</button>
              <button onClick={handleConfirmPickup} disabled={actionLoading} style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? '...' : 'Oui, confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <XCircle size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem' }}>Annuler la commande</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>Êtes-vous sûr de vouloir annuler la commande <strong>#{selectedOrder?.id}</strong> ? Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Non, retour</button>
              <button onClick={handleCancel} disabled={actionLoading} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? '...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
