import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Trash2, Printer, RefreshCw } from 'lucide-react'
import adminClient from '../../api/adminClient'


function Pagination({ page, totalPages, onPage }) {
  const actualTotalPages = Math.max(1, totalPages)
  if (actualTotalPages <= 1) return (
    <div className="admin-pagination">
      <button className="admin-page-btn" disabled>‹</button>
      <button className="admin-page-btn active">1</button>
      <button className="admin-page-btn" disabled>›</button>
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
  pending: 'En attente', confirmed: 'Confirmé',
  shipped: 'En livraison', fulfilled: 'Fulfilled', cancelled: 'Annulée', returned: 'Retournée',
}

const STATUS_BADGE = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  shipped: 'badge-shipped', fulfilled: 'badge-fulfilled', cancelled: 'badge-cancelled', returned: 'badge-returned',
}

export default function AdminOrders({ isB2B = false }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [deliveryFilter, setDeliveryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [selectedIds, setSelectedIds] = useState([])

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter) params.append('status', filter)
    if (paymentFilter) params.append('payment_status', paymentFilter)
    if (deliveryFilter) params.append('delivery_type', deliveryFilter)
    if (search) params.append('search', search)
    if (isB2B) params.append('customer__is_b2b', 'true')
    params.append('page_size', 500)
    adminClient.get(`/admin/orders/?${params}`)
      .then(r => setOrders(r.data.results || r.data))
      .catch(err => {
        console.error('Erreur chargement commandes:', err?.response?.data || err)
        setOrders([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { 
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && detail) setDetail(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detail])

  useEffect(() => { 
    setPage(1)
    load() 
  }, [filter, paymentFilter, deliveryFilter, search, isB2B])

  useEffect(() => {
    // Mark these orders as viewed
    adminClient.post('/admin/orders/mark_viewed/', { type: isB2B ? 'b2b' : 'normal' })
      .then(() => {
        window.dispatchEvent(new Event('ordersViewed'))
      })
      .catch(() => {})
  }, [isB2B])

  const handleSelectAll = (e) => {
    const visibleOrders = orders.slice((page - 1) * perPage, page * perPage)
    if (e.target.checked) {
      const newIds = new Set([...selectedIds, ...visibleOrders.map(o => o.id)])
      setSelectedIds(Array.from(newIds))
    } else {
      const visibleIds = visibleOrders.map(o => o.id)
      setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)))
    }
  }

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer les ${selectedIds.length} commande(s) sélectionnée(s) ?`)) return
    try {
      await adminClient.post('/admin/orders/bulk_delete/', { ids: selectedIds })
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Erreur lors de la suppression groupée')
    }
  }

  const handleBulkStatusUpdate = async (statusId) => {
    if (!window.confirm(`Mettre à jour le statut des ${selectedIds.length} commandes vers "${STATUS_LABELS[statusId]}" ?`)) return
    try {
      await adminClient.post('/admin/orders/bulk_update_status/', { ids: selectedIds, status: statusId })
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleBulkExportExcel = async () => {
    try {
      const r = await adminClient.post('/admin/orders/bulk_export_excel/', { ids: selectedIds }, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'commandes_export.xlsx')
      document.body.appendChild(link)
      link.click()
    } catch (e) {
      alert('Erreur lors de l\'export Excel')
    }
  }

  const handleBulkPackingSlips = async () => {
    if (selectedIds.length === 0) return
    try {
      const r = await adminClient.post('/admin/orders/bulk_packing_slips/', { ids: selectedIds })
      const w = window.open('about:blank', '_blank')
      w.document.open()
      w.document.write(r.data)
      w.document.close()
    } catch (e) {
      alert('Erreur lors de la génération des bons')
    }
  }

  const handleBulkMylerzShip = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm('Voulez-vous générer les colis Mylerz pour les commandes sélectionnées ?')) return
    try {
      const res = await adminClient.post('/admin/orders/bulk_mylerz_ship/', { ids: selectedIds })
      const results = res.data?.results || []
      const failed = results.filter(r => !r.success)
      const ok = results.filter(r => r.success)
      if (failed.length === 0) {
        alert(`✅ ${ok.length} colis Mylerz créé(s) avec succès.`)
      } else {
        const msgs = failed.map(r => `#${r.id}: ${r.message || r.error || 'Erreur inconnue'}`).join('\n')
        alert(`⚠️ ${ok.length} réussi(s), ${failed.length} échec(s):\n\n${msgs}`)
      }
      load()
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || 'Erreur inconnue'
      alert(`Erreur Mylerz:\n${msg}`)
    }
  }

  const handleBulkMylerzTrack = async () => {
    if (selectedIds.length === 0) return
    try {
      await adminClient.post('/admin/orders/bulk_mylerz_track/', { ids: selectedIds })
      alert('Statuts Mylerz actualisés.')
      load()
    } catch (e) {
      alert("Erreur lors de l'actualisation Mylerz.")
    }
  }

  const handleBulkMylerzCancel = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm('Voulez-vous vraiment annuler les envois Mylerz sélectionnés ?')) return
    try {
      await adminClient.post('/admin/orders/bulk_mylerz_cancel/', { ids: selectedIds })
      alert('Envois Mylerz annulés.')
      load()
    } catch (e) {
      alert("Erreur lors de l'annulation Mylerz.")
    }
  }

  const handleMylerzTest = async () => {
    try {
      const res = await adminClient.get('/admin/orders/mylerz_test/')
      const d = res.data
      const html = `<!DOCTYPE html><html><head><title>Mylerz Diagnostic</title>
<style>body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:24px;margin:0}
h2{color:#38bdf8;margin-bottom:16px}
.ok{color:#4ade80}.err{color:#f87171}.sec{color:#fbbf24;margin-top:16px;font-weight:bold}
pre{background:#1e293b;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:13px}
</style></head><body>
<h2>🔧 Diagnostic Mylerz</h2>
<pre>Username    : ${d.username || '(vide)'}
Password    : ${d.password_set ? '<span class="ok">✅ Configuré</span>' : '<span class="err">❌ Non configuré</span>'}
Warehouse   : ${d.warehouse || '(vide)'}
Base URL    : ${d.base_url}
Auth        : <span class="${d.auth === 'OK' ? 'ok' : 'err'}">${d.auth}</span></pre>
${d.addorders_status ? `<div class="sec">--- Test AddOrders ---</div>
<pre>HTTP Status : <span class="${d.addorders_status < 300 ? 'ok' : 'err'}">${d.addorders_status}</span>
Réponse     : ${JSON.stringify(d.addorders_response || d.addorders_response_raw || d.addorders_error, null, 2)}</pre>` : ''}
</body></html>`
      const w = window.open('', '_blank', 'width=800,height=600')
      w.document.write(html)
      w.document.close()
    } catch (e) {
      alert('Erreur diagnostic: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handlePrintSingleBordereau = async (id) => {
    try {
      const r = await adminClient.post('/admin/orders/bulk_packing_slips/', { ids: [id] })
      const w = window.open('about:blank', '_blank')
      w.document.open()
      w.document.write(r.data)
      w.document.close()
    } catch (e) {
      alert('Erreur lors de la génération du bordereau')
    }
  }

  const visibleOrders = orders.slice((page - 1) * perPage, page * perPage)
  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every(o => selectedIds.includes(o.id))

  const stats = {
    total: orders.length,
    revenue: orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned').reduce((acc, o) => acc + Number(o.total) + Number(o.delivery_cost), 0),
    pending: orders.filter(o => o.status === 'pending').length,
    shipped: orders.filter(o => o.status === 'shipped' || o.status === 'fulfilled').length
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Commandes</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{stats.total}</span>
        </div>
        <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Revenus (Est.)</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: 4 }}>{stats.revenue.toLocaleString('fr-DZ')} DA</span>
        </div>
        <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>En Attente</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{stats.pending}</span>
        </div>
        <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fulfilled</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{stats.shipped}</span>
        </div>
      </div>

      <div className="admin-page-header">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{isB2B ? 'Commandes B2B' : 'Commandes'}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedIds.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Actions ({selectedIds.length}) :</span>
              
              <select 
              className="admin-filter-select" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: 140 }}
              onChange={(e) => { if (e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ''; }}
            >
              <option value="">Marquer comme...</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <button className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap' }} onClick={handleBulkMylerzShip}>
              Expédier
            </button>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.8rem', background: '#f59e0b', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap' }} onClick={handleBulkMylerzTrack}>
              <RefreshCw size={14}/> Actualiser
            </button>
            <button className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#ef4444', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap' }} onClick={handleBulkMylerzCancel}>
              Annuler Envoi
            </button>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.8rem', background: '#8b5cf6', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap' }} onClick={handleBulkPackingSlips}>
              <Printer size={14}/> Imprimer
            </button>
            <button className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10b981', color: 'white', borderRadius: 50, border: 'none', whiteSpace: 'nowrap' }} onClick={handleBulkExportExcel}>
              📊 Exporter
            </button>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', background: '#1f2937', color: 'white', borderRadius: 50, border: 'none' }} title="Supprimer" onClick={handleBulkDelete}>
              <Trash2 size={16}/>
            </button>
            </div>
          ) : (
            <>
            <button className="btn-primary" onClick={() => navigate(isB2B ? '/admin-panel/orders-b2b/new' : '/admin-panel/orders/new')}>
              <Plus size={16}/> Créer une Commande
            </button>
            <button
              onClick={handleMylerzTest}
              title="Tester la connexion Mylerz"
              style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', borderRadius: 50, border: '1px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              🔧 Test Mylerz
            </button>
            </>
          )}
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
              value={deliveryFilter}
              onChange={e => setDeliveryFilter(e.target.value)}
            >
              <option value="">Livraison: Tout</option>
              <option value="home">À domicile</option>
              <option value="desk">Bureau / Relais</option>
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
              par page
            </div>
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
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox" checked={allVisibleSelected} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                    </th>
                    <th>#</th><th>Client</th><th>Contact</th><th>Wilaya</th>
                    <th>T.Produits</th>
                  <th>Livraison</th>
                  <th>Total</th>
                    <th>Paiement</th><th>Statut</th><th>Origine</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map(o => (
                  <tr 
                    key={o.id} 
                    style={{ ...(o.is_blacklisted ? { background: '#fff0f0' } : {}) }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={() => handleSelect(o.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>#{o.id}</td>
                    <td style={{ fontWeight: 500 }}>
                      {o.customer_name}
                      {o.is_blacklisted && <span className="badge badge-danger" style={{marginLeft: 8, fontSize: '0.65rem', padding: '2px 4px'}}>BLACKLIST</span>}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
                      {o.guest_phone || (o.user ? '—' : '—')}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{o.wilaya || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{(Number(o.total) - Number(o.delivery_cost)).toLocaleString('fr-DZ')} DA</td>
                    <td style={{ color: 'var(--color-gray-500)' }}>{Number(o.delivery_cost).toLocaleString('fr-DZ')} DA</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-black)' }}>{Number(o.total).toLocaleString('fr-DZ')} DA</td>
                    <td>
                      {o.payment_method === 'cib' ? (
                        <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.65rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>En Ligne</span>
                      ) : (
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>Cash</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[o.status]}`} style={{ fontSize: '0.65rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {(() => {
                        if (!o.source) return <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                        const SRC = {
                          fb:      { label: 'Facebook',  bg: '#1877f2' },
                          ig:      { label: 'Instagram', bg: '#e1306c' },
                          direct:  { label: 'Direct',    bg: '#6366f1' },
                          google:  { label: 'Google',    bg: '#34a853' },
                          tiktok:  { label: 'TikTok',    bg: '#010101' },
                          referral:{ label: 'Référent',  bg: '#10b981' },
                        }
                        const s = SRC[o.source] || { label: o.source, bg: '#64748b' }
                        return <span style={{ background: s.bg, color: '#fff', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                      })()}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '6px', background: '#f1f5f9', borderRadius: '50%', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }} 
                          onClick={() => setDetail(o)} 
                          title="Aperçu rapide"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '6px', background: '#f1f5f9', borderRadius: '50%', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }} 
                          onClick={() => navigate(`/admin-panel/orders/${o.id}`)} 
                          title="Détails complets"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '6px', background: '#fef2f2', borderRadius: '50%', color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }} 
                          onClick={async () => {
                            if(window.confirm('Supprimer cette commande ?')) {
                              await adminClient.delete(`/admin/orders/${o.id}/`);
                              load();
                            }
                          }}
                          title="Supprimer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={10}><div className="admin-empty"><p>Aucune commande.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
              <Pagination page={page} totalPages={Math.ceil(orders.length / perPage)} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {/* QUICK PREVIEW MODAL */}
      {detail && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="admin-modal" style={{ maxWidth: 600 }}>
            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="admin-modal-title">Aperçu Commande #{detail.id}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginRight: 16, fontWeight: 500, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20 }}>{detail.items?.length || 0} article{detail.items?.length > 1 ? 's' : ''}</span>
                <button type="button" className="admin-modal-close" onClick={() => setDetail(null)}><X size={20}/></button>
              </div>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{detail.customer_name}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{detail.guest_phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 4 }}>LIVRAISON</div>
                  <div style={{ fontSize: '0.9rem' }}>{detail.shipping_address}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{detail.wilaya} — {detail.city}</div>
                </div>
              </div>
              
              <div style={{ background: 'var(--admin-surface2)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {detail.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--admin-border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.product_name}</div>
                      {item.variant_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          {item.variant_color && (
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: item.variant_color, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontStyle: 'italic' }}>{item.variant_name}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Qté: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>{Number(item.subtotal).toLocaleString('fr-DZ')} DA</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Sous-total</span>
                  <span style={{ fontWeight: 500 }}>{(Number(detail.total) - Number(detail.delivery_cost || 0)).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Livraison</span>
                  <span style={{ fontWeight: 500 }}>{Number(detail.delivery_cost || 0).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: 8, marginTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total commande</span>
                    <span className={`badge ${STATUS_BADGE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--admin-gold, #b8860b)' }}>
                    {Number(detail.total).toLocaleString('fr-DZ')} DA
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
               <button className="btn" style={{ background: '#eab308', color: 'white', borderRadius: 20, border: 'none', fontWeight: 600, padding: '8px 20px' }} onClick={() => navigate(`/admin-panel/orders/${detail.id}`)}>Voir tout</button>
               <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 20, fontWeight: 600, padding: '8px 20px' }} onClick={() => handlePrintSingleBordereau(detail.id)}>
                 🖨️ Bordereau
               </button>
               <button className="btn" style={{ background: '#dc3545', color: 'white', borderRadius: 20, border: 'none', fontWeight: 600, padding: '8px 20px' }} onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
