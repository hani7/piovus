import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'
import { Printer, RefreshCw, Edit2, Store } from 'lucide-react'

const STATUS_LABELS = {
  pending: 'En attente',
  payment_failed: 'Paiement échoué',
  confirmed: 'Confirmé',
  en_cours: 'En cours',
  shipped: 'En livraison',
  fulfilled: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

const STATUS_BADGE = {
  pending: 'badge-pending',
  payment_failed: 'badge-danger',
  confirmed: 'badge-confirmed',
  en_cours: 'badge-pending',
  shipped: 'badge-shipped',
  fulfilled: 'badge-fulfilled',
  cancelled: 'badge-cancelled',
  returned: 'badge-returned',
  boutique: 'badge-pending',
}

// Couleurs identiques au portail Mylerz
const MYLERZ_STATUS_STYLE = (s = '') => {
  const sl = s.toLowerCase()
  // Noms du portail Mylerz (API traduits vers portal names)
  if (sl.includes('delivered in forward') || sl === 'delivered')
                                               return { bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: '✅' }
  if (sl.includes('ready in forward delivery') || sl.includes('out for delivery'))
                                               return { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', icon: '🚚' }
  if (sl.includes('received in hub in shuttling') || sl.includes('shuttling'))
                                               return { bg: '#e0e7ff', color: '#4338ca', border: '#a5b4fc', icon: '📦' }
  if (sl.includes('in transit') || sl.includes('in transit to destination'))
                                               return { bg: '#fef9c3', color: '#a16207', border: '#fde047', icon: '🔄' }
  if (sl.includes('ready in picking') || sl.includes('ready for pickup'))
                                               return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d', icon: '📋' }
  if (sl.includes('ready in pickup') || sl.includes('data uploaded') || sl.includes('shipment created'))
                                               return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '📤' }
  if (sl.includes('returned') || sl.includes('reverse') || sl.includes('return'))
                                               return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', icon: '↩️' }
  if (sl.includes('cancel'))                   return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', icon: '❌' }
  if (sl.includes('failed'))                   return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', icon: '⚠️' }
  return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: '📦' }
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  // Mylerz states
  const [mylerzLoading, setMylerzLoading] = useState(false)
  const [trackingData, setTrackingData] = useState(null)
  const [showTracking, setShowTracking] = useState(false)
  const [mylerzStatusDate, setMylerzStatusDate] = useState(null) // date du dernier statut Mylerz

  // Boutique Transfer State
  const [showBoutiqueModal, setShowBoutiqueModal] = useState(false)
  const [boutiquesList, setBoutiquesList] = useState([])
  const [selectedBoutique, setSelectedBoutique] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Edit panel state
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editItems, setEditItems] = useState([])
  const [editSaving, setEditSaving] = useState(false)
  // Ajout de nouveaux produits à la commande
  const [newItems, setNewItems] = useState([])          // [{product, variant, quantity}]
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState([])
  const [addSearching, setAddSearching] = useState(false)

  const openEdit = () => {
    setEditForm({
      guest_name: detail.guest_name || '',
      guest_phone: detail.guest_phone || '',
      guest_phone2: detail.guest_phone2 || '',
      guest_email: detail.guest_email || '',
      shipping_address: detail.shipping_address || '',
      wilaya: detail.wilaya || '',
      city: detail.city || '',
      notes: detail.notes || '',
    })
    setEditItems((detail.items || []).map(it => ({ ...it, _qty: it.quantity })))
    setNewItems([])
    setAddSearch('')
    setAddResults([])
    setShowEdit(true)
  }

  const handleEditSave = async () => {
    setEditSaving(true)
    try {
      const payload = {
        ...editForm,
        items: editItems.map(it => ({ id: it.id, quantity: Number(it._qty) })),
        new_items: newItems.map(ni => ({
          product_id: ni.product.id,
          variant_id: ni.variant ? ni.variant.id : null,
          quantity: ni.quantity,
        })),
      }
      const res = await adminClient.post(`/admin/orders/${id}/edit_order/`, payload)
      setDetail(res.data)
      setShowEdit(false)
    } catch (e) {
      alert('Erreur lors de la sauvegarde: ' + (e.response?.data?.detail || e.message))
    } finally {
      setEditSaving(false)
    }
  }

  // Recherche produit pour ajout à la commande
  useEffect(() => {
    if (!addSearch || addSearch.length < 2) { setAddResults([]); return }
    const t = setTimeout(async () => {
      setAddSearching(true)
      try {
        const r = await adminClient.get(`/admin/products/?search=${encodeURIComponent(addSearch)}`)
        setAddResults(r.data.results || r.data)
      } catch {}
      finally { setAddSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [addSearch])

  const addProductToNew = (product) => {
    const existing = newItems.find(n => n.product.id === product.id && !n.variant)
    if (existing) {
      setNewItems(newItems.map(n => n === existing ? { ...n, quantity: n.quantity + 1 } : n))
    } else {
      setNewItems([...newItems, { product, variant: null, quantity: 1 }])
    }
    setAddSearch('')
    setAddResults([])
  }

  const load = () => {
    setLoading(true)
    adminClient.get(`/admin/orders/${id}/`)
      .then(r => setDetail(r.data))
      .catch(() => {
        alert('Erreur: Commande introuvable')
        navigate('/piove-secure-2026/orders')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetchBoutiques()
  }, [id])

  const fetchBoutiques = async () => {
    try {
      const res = await adminClient.get('/admin/boutiques/')
      const data = res.data.results || res.data
      if (Array.isArray(data)) {
        setBoutiquesList(data.filter(b => b.is_active))
      }
    } catch (e) { console.error(e) }
  }

  const handleTransferBoutique = async () => {
    if (!selectedBoutique) return alert('Veuillez s\u00e9lectionner une boutique.')
    setTransferring(true)
    try {
      await adminClient.post(`/admin/orders/${id}/transfer_to_boutique/`, { boutique_id: selectedBoutique })
      setShowBoutiqueModal(false)
      load()
    } catch (e) { alert(e.response?.data?.error || 'Erreur lors du transfert.') } finally { setTransferring(false) }
  }


  // ── Auto-sync Mylerz dès le chargement (silencieux) ──────────────────────
  useEffect(() => {
    if (!detail?.mylerz_barcode) return
    adminClient.get(`/admin/orders/${id}/mylerz_track/`)
      .then(res => {
        const newMylerz = res.data?.mylerz_status
        const newPiove  = res.data?.piove_status
        const tracking  = res.data?.tracking || []
        if (newMylerz) {
          setDetail(prev => prev ? {
            ...prev,
            mylerz_status: newMylerz,
            status: newPiove || prev.status,
          } : prev)
          setTrackingData(tracking)
          setShowTracking(tracking.length > 0)
          // Date du statut le plus récent (index 0 = plus récent)
          if (tracking.length > 0 && tracking[0].Date) {
            setMylerzStatusDate(tracking[0].Date)
          }
        }
      })
      .catch(() => {}) // silencieux
  }, [detail?.mylerz_barcode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatus = async (newStatus) => {
    await adminClient.patch(`/admin/orders/${id}/`, { status: newStatus })
    load()
  }

  const handleMylerzShip = async () => {
    if (!window.confirm('Voulez-vous générer un colis Mylerz pour cette commande ?')) return
    setMylerzLoading(true)
    try {
      await adminClient.post(`/admin/orders/${id}/mylerz_ship/`)
      alert('Colis Mylerz créé avec succès.')
      load()
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || JSON.stringify(e.response?.data) || 'Erreur lors de la création du colis.'
      alert('âŒ ' + msg)
    } finally {
      setMylerzLoading(false)
    }
  }

  const handleMylerzDebug = async () => {
    setMylerzLoading(true)
    try {
      const res = await adminClient.get(`/admin/orders/${id}/mylerz_ship_debug/`)
      const d = res.data
      const html = `<!DOCTYPE html><html><head><title>Debug Mylerz #${id}</title>
<style>body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:24px;margin:0}
h2{color:#38bdf8}h3{color:#fbbf24;margin-top:20px}
.ok{color:#4ade80}.err{color:#f87171}
pre{background:#1e293b;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:12px;max-height:400px}
</style></head><body>
<h2>ðŸ” Debug Payload Mylerz — Commande #${d.order_id}</h2>
<div class="${d.mylerz_barcode_already_set ? 'err' : 'ok'}">
  Barcode déjà enregistré: ${d.mylerz_barcode_already_set ? 'âŒ OUI â†’ ' + d.mylerz_barcode : 'âœ… Non (nouvelle expédition)'}
</div>
${d.error ? `<h3>âŒ ERREUR lors de la construction du payload</h3><pre>${d.error}\n\n${d.traceback}</pre>` : ''}
<h3>Payload qui sera envoyé à Mylerz:</h3>
<pre>${JSON.stringify(d.payload, null, 2)}</pre>
<h3>WarehouseName: <span class="${d.warehouse ? 'ok' : 'err'}">${d.warehouse || '(vide — non envoyé)'}</span></h3>
</body></html>`
      const w = window.open('', '_blank', 'width=900,height=700')
      w.document.write(html)
      w.document.close()
    } catch (e) {
      alert('Debug error: ' + (e.response?.data?.error || e.message))
    } finally {
      setMylerzLoading(false)
    }
  }

  const handleMylerzTrack = async () => {
    setMylerzLoading(true)
    try {
      const res = await adminClient.get(`/admin/orders/${id}/mylerz_track/`)
      const newMylerz = res.data?.mylerz_status
      const newPiove  = res.data?.piove_status
      const tracking  = res.data?.tracking || []
      setTrackingData(tracking)
      setShowTracking(true)
      if (newMylerz) {
        setDetail(prev => prev ? {
          ...prev,
          mylerz_status: newMylerz,
          status: newPiove || prev.status,
        } : prev)
        if (tracking.length > 0 && tracking[0].Date) {
          setMylerzStatusDate(tracking[0].Date)
        }
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur de suivi.')
    } finally {
      setMylerzLoading(false)
    }
  }

  const handleMylerzCancel = async () => {
    if (!window.confirm("Voulez-vous vraiment annuler l'envoi Mylerz ?")) return
    setMylerzLoading(true)
    try {
      await adminClient.post(`/admin/orders/${id}/mylerz_cancel/`)
      alert('Envoi annulé avec succès.')
      load()
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'annulation.")
    } finally {
      setMylerzLoading(false)
    }
  }

  const handlePrintSingleBordereau = async () => {
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

  if (loading) return <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
  if (!detail) return null

  return (
    <>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate('/piove-secure-2026/orders')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', padding: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            Détails Commande
            <span style={{
              background: '#cc0000', color: '#fff', borderRadius: 50,
              padding: '3px 16px', fontSize: '1.1rem', fontWeight: 800,
              letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center'
            }}>#{detail.id}</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            {detail.payment_method === 'cib' ? 'Paiement en ligne (CIB/Edahabia)' : 'Paiement à la livraison'} — {new Date(detail.created_at).toLocaleString('fr-DZ')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {detail.mylerz_barcode ? (
             <>
               <button className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, backgroundColor: '#f59e0b', color: 'white', border: 'none', display: 'flex', alignItems: 'center' }} onClick={handleMylerzTrack} disabled={mylerzLoading}>
                 <RefreshCw size={14} style={{ marginRight: 4 }} /> ACTUALISER
               </button>
               {(!detail.mylerz_status || !detail.mylerz_status.toLowerCase().includes('cancel')) && (
                 <button className="admin-btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, display: 'flex', alignItems: 'center' }} onClick={handleMylerzCancel} disabled={mylerzLoading}>
                   ANNULER ENVOI
                 </button>
               )}
               <button className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, backgroundColor: '#8b5cf6', color: 'white', border: 'none', display: 'flex', alignItems: 'center' }} onClick={handlePrintSingleBordereau} disabled={mylerzLoading}>
                 <Printer size={14} style={{ marginRight: 4 }} /> IMPRIMER
               </button>
             </>
          ) : (
             <>
               <button className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, display: 'flex', alignItems: 'center', border: 'none' }} onClick={handleMylerzShip} disabled={mylerzLoading || detail.status === 'boutique'}>
                 EXPÉDIER
               </button>
               {detail.status !== 'boutique' && (
                 <button className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 20, backgroundColor: '#8b5cf6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowBoutiqueModal(true)}>
                   <Store size={14} /> BOUTIQUE
                 </button>
               )}
             </>
          )}

          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: '0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}
            onClick={openEdit}
          >
            ✏️ Modifier
          </button>
          <button 
            className="btn" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 20 }}
            onClick={() => window.print()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            FACTURE
          </button>
          <span className={`badge ${STATUS_BADGE[detail.status]}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{STATUS_LABELS[detail.status]}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 4 Info Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>

            {/* Général */}
            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Général</h4>
              <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(detail.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Heure</span>
                <span style={{ fontWeight: 600 }}>{new Date(detail.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Client</span>
                <span style={{
                  background: detail.user ? '#e0f2fe' : '#f1f5f9',
                  color: detail.user ? '#0369a1' : '#475569',
                  borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700
                }}>{detail.user ? 'Inscrit' : 'Invité'}</span>
              </div>
              <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Paiement</span>
                <span style={{
                  background: detail.payment_method === 'cib' ? '#e0e7ff' : '#f1f5f9',
                  color: detail.payment_method === 'cib' ? '#3730a3' : '#475569',
                  borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700
                }}>{detail.payment_method === 'cib' ? 'En ligne' : 'Cash'}</span>
              </div>
              {detail.coupon_code && (
                <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Coupon</span>
                  <span style={{ fontFamily: 'monospace', background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 700 }}>{detail.coupon_code}</span>
                </div>
              )}
              {detail.discount_amount > 0 && (
                <div style={{ fontSize: '0.88rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Réduction</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>- {Number(detail.discount_amount).toLocaleString('fr-DZ')} DA</span>
                </div>
              )}
              <div style={{ fontSize: '0.88rem', marginTop: 14 }}>
                <strong style={{ color: '#475569', display: 'block', marginBottom: 4 }}>Changer l'état:</strong>
                <select className="status-select" value={detail.status} onChange={e => handleStatus(e.target.value)} style={{ width: '100%', padding: 8 }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Facturation */}
            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Client</h4>
                <button onClick={openEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center' }} title="Modifier">
                  <Edit2 size={14} />
                </button>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {detail.customer_name}
                {detail.is_blacklisted && <span className="badge badge-danger" style={{ fontSize: '0.6rem', padding: '2px 5px', borderRadius: 4 }}>BLACKLIST</span>}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 10 }}>{detail.shipping_address}</div>
              <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 12, fontWeight: 600 }}>{detail.wilaya} — {detail.city}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#0f172a' }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="#64748b" strokeWidth="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {detail.guest_email || <span style={{ color: '#94a3b8' }}>—</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="#64748b" strokeWidth="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {detail.guest_phone || <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>}
                </div>
                {detail.guest_phone2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="#10b981" strokeWidth="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {detail.guest_phone2}
                  </div>
                )}
              </div>
            </div>

            {/* Expédition */}
            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Expédition</h4>
              <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 4 }}>{detail.shipping_address}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>{detail.wilaya} — {detail.city}</div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transporteur</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{detail.delivery_company_name || 'Non spécifié'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                    {detail.delivery_type === 'desk' ? '🏢 Point de retrait' : '🏠 À domicile'}
                  </div>
                </div>
                {detail.mylerz_barcode && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mylerz barcode</div>
                    <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6', marginTop: 2 }}>{detail.mylerz_barcode}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Résumé Financier */}
            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Résumé Financier</h4>
              {(()=>{
                const subtotal = Number(detail.total)
                const delivery = Number(detail.delivery_cost || 0)
                const discount = Number(detail.discount_amount || 0)
                const productsOnly = subtotal - delivery
                const grand = subtotal + delivery - discount
                const Row = ({label, value, color, bold}) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <span style={{ fontWeight: bold ? 700 : 500, color: color || '#1e293b' }}>{value}</span>
                  </div>
                )
                return (
                  <>
                    <Row label="Produits" value={`${productsOnly.toLocaleString('fr-DZ')} DA`} />
                    <Row label="Livraison" value={`${delivery.toLocaleString('fr-DZ')} DA`} />
                    {discount > 0 && <Row label="Réduction" value={`- ${discount.toLocaleString('fr-DZ')} DA`} color="#10b981" />}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                      <Row label="Total" value={`${subtotal.toLocaleString('fr-DZ')} DA`} bold />
                    </div>
                    <div style={{ marginTop: 10, background: '#0f172a', color: '#fff', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Bénéfice net</span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#4ade80' }}>{productsOnly.toLocaleString('fr-DZ')} DA</span>
                    </div>
                  </>
                )
              })()}
            </div>

          </div>

          {/* Items Table Card */}
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th colSpan="2" style={{ paddingLeft: 20 }}>Article</th>
                  <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                  <th style={{ textAlign: 'center' }}>Qté</th>
                  <th style={{ textAlign: 'right', paddingRight: 20 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items?.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ width: 60, paddingLeft: 20 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{item.product_name}</div>
                      {item.variant_name && <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>Variante: {item.variant_name}</div>}
                    </td>
                    <td style={{ textAlign: 'right', color: '#475569', fontSize: '0.9rem' }}>{Number(item.price_at_purchase).toLocaleString('fr-DZ')} DA</td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>× {item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', paddingRight: 20 }}>{Number(item.subtotal).toLocaleString('fr-DZ')} DA</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px', background: '#fff' }}>
              <div style={{ width: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem', color: '#475569' }}>
                  <span>Sous-total des articles:</span>
                  <span>{(Number(detail.total) - Number(detail.delivery_cost || 0)).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem', color: '#475569' }}>
                  <span>Frais de livraison:</span>
                  <span>{Number(detail.delivery_cost || 0).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  <span>Total de la commande:</span>
                  <span>{Number(detail.total).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>
                  <span>Mode de paiement:</span>
                  <span style={{ color: detail.payment_method === 'cib' ? 'var(--color-accent)' : 'inherit' }}>
                    {detail.payment_method === 'cib' ? 'CIB ou Edahabia' : 'À la livraison (Cash)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar Info & TIMELINE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
           {/* Actions */}
           <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Actions</h4>
              <button className="btn btn-black" style={{ width: '100%', marginBottom: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} onClick={() => window.print()}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimer la facture
              </button>
              <button className="btn btn-outline" style={{ width: '100%', color: '#dc3545', borderColor: '#dc3545', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} onClick={async () => {
                if(window.confirm('Supprimer cette commande ?')) {
                  await adminClient.delete(`/admin/orders/${detail.id}/`);
                  navigate('/piove-secure-2026/orders')
                }
              }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Supprimer
              </button>
           </div>

           {/* Mylerz Delivery */}
           <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
             <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               Mylerz Livraison
               {mylerzLoading && <div className="spin" style={{ width: 14, height: 14, borderWidth: 2 }}></div>}
             </h4>
             
             {detail.mylerz_barcode ? (
               <div>
                 <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                   <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Code Barres:</div>
                   <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     {detail.mylerz_barcode}
                     <button onClick={() => navigator.clipboard.writeText(detail.mylerz_barcode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                       <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     </button>
                   </div>
                   {detail.mylerz_pickup_code && (
                     <>
                       <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8, marginBottom: 4 }}>Code Collecte:</div>
                       <div style={{ fontWeight: 600, color: '#0f172a' }}>{detail.mylerz_pickup_code}</div>
                     </>
                   )}
                    {(() => {
                      const ms = MYLERZ_STATUS_STYLE(detail.mylerz_status)
                      const fmtDate = mylerzStatusDate
                        ? new Date(mylerzStatusDate).toLocaleString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : null
                      return (
                        <div style={{ marginTop: 12, background: ms.bg, border: `1.5px solid ${ms.border}`, borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem' }}>{ms.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: ms.color, marginBottom: 2 }}>Statut Mylerz</div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: ms.color }}>{detail.mylerz_status || 'Shipment Created'}</div>
                            </div>
                          </div>
                          {fmtDate && (
                            <div style={{ marginTop: 6, fontSize: '0.75rem', color: ms.color, opacity: 0.8 }}>
                              📅 {fmtDate}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>


                 <div style={{ display: 'flex', gap: 8, flexDirection: 'column', marginTop: 12 }}>
                   <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', fontSize: '0.85rem', background: '#f59e0b', color: 'white', borderRadius: 50, border: 'none' }} onClick={handleMylerzTrack} disabled={mylerzLoading}>
                     <RefreshCw size={14}/> Actualiser
                   </button>
                   <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', fontSize: '0.85rem', background: '#8b5cf6', color: 'white', borderRadius: 50, border: 'none' }} onClick={handlePrintSingleBordereau} disabled={mylerzLoading}>
                     <Printer size={14}/> Imprimer
                   </button>
                   {(!detail.mylerz_status || !detail.mylerz_status.toLowerCase().includes('cancel')) && (
                     <button className="btn" style={{ width: '100%', fontSize: '0.85rem', background: '#ef4444', color: 'white', borderRadius: 50, border: 'none' }} onClick={handleMylerzCancel} disabled={mylerzLoading}>
                       Annuler Envoi
                     </button>
                   )}
                 </div>

                  {/* Historique Mylerz */}
                  {showTracking && trackingData && trackingData.length > 0 && (
                    <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historique Mylerz</div>
                      {trackingData.map((t, idx) => {
                        const ts = MYLERZ_STATUS_STYLE(t.Status || '')
                        const dt = t.Date ? new Date(t.Date).toLocaleString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '0.85rem', marginTop: 1 }}>{ts.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ts.color }}>{t.Status}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{dt}</div>
                            </div>
                            {idx === 0 && <span style={{ fontSize: '0.6rem', background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, borderRadius: 10, padding: '2px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>ACTUEL</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
               </div>
             ) : (
               <div>
                 <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
                   Aucun colis généré pour cette commande.
                 </div>
                 <button className="btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#3b82f6', color: 'white', borderRadius: 50, border: 'none', padding: '10px 0' }} onClick={handleMylerzShip} disabled={mylerzLoading || detail.status === 'boutique'}>
                   Expédier
                 </button>
               </div>
             )}
           </div>

          {/* Timeline - Suivi COMPLET */}
          <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Suivi de commande</h4>
            <div style={{ position: 'relative', paddingLeft: 12 }}>
              {/* Timeline Line */}
              <div style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 2, background: '#e2e8f0', zIndex: 0 }}></div>
              
              {detail.history?.length > 0 ? (
                detail.history.map((h, idx) => (
                  <div key={h.id} style={{ position: 'relative', zIndex: 1, paddingLeft: 24, marginBottom: idx === detail.history.length - 1 ? 0 : 20 }}>
                    {/* Dot */}
                    <div style={{ position: 'absolute', left: 0, top: 4, width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? '#0f172a' : '#cbd5e1', border: '2px solid #fff' }}></div>
                    {(() => {
                      const mylerzMatch = h.notes && h.notes.match(/Mylerz\s*:\s*(.+)$/i)
                      const mylerzLabel = mylerzMatch ? mylerzMatch[1].trim() : null
                      if (mylerzLabel) {
                        const ms = MYLERZ_STATUS_STYLE(mylerzLabel)
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ms.bg, border: `1px solid ${ms.border}`, borderRadius: 20, padding: '3px 10px', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.9rem' }}>{ms.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: ms.color }}>{mylerzLabel}</span>
                          </div>
                        )
                      }
                      return <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: 2 }}>{h.status_display}</div>
                    })()}
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                      {new Date(h.created_at).toLocaleString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {h.notes && !h.notes.match(/Mylerz\s*:/i) && (
                      <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 4, fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                        {h.notes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ paddingLeft: 24, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>Aucun historique disponible.</div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Notes du Client</h4>
            {detail.notes ? (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 6, fontSize: '0.9rem', lineHeight: 1.5 }}>
                {detail.notes}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Aucune note laissée par le client.</div>
            )}
          </div>

          {/* Origine de la commande */}
          {(() => {
            const SOURCE_META = {
              fb:       { label: 'Facebook',   color: '#1877f2', bg: '#e7f0fd' },
              ig:       { label: 'Instagram',  color: '#e1306c', bg: '#fce4ec' },
              direct:   { label: 'Direct',     color: '#6366f1', bg: '#eef2ff' },
              google:   { label: 'Google',     color: '#34a853', bg: '#e6f4ea' },
              tiktok:   { label: 'TikTok',     color: '#010101', bg: '#f1f5f9' },
              referral: { label: 'Référent',   color: '#10b981', bg: '#ecfdf5' },
            }
            const raw = detail.source || ''
            const parts = raw.split(' | ')
            const mainKey = parts[0] || 'direct'
            const extras = parts.slice(1)

            // Parse extras: 'md:paid / cp:120248411693210015 / fbclid'
            const extraMap = {}
            extras.forEach(chunk => {
              chunk.split(' / ').forEach(piece => {
                const [k, ...rest] = piece.trim().split(':')
                if (k) extraMap[k.trim()] = rest.join(':').trim() || 'oui'
              })
            })

            const meta = SOURCE_META[mainKey] || { label: mainKey || 'Inconnu', color: '#64748b', bg: '#f1f5f9' }
            const hasFbclid = 'fbclid' in extraMap
            const medium = extraMap['md'] || null
            const campaign = extraMap['cp'] || null
            const referrer = detail.referrer_url || null

            const Row = ({ label, value, mono }) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
              </div>
            )

            return (
              <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Origine de la Commande</h4>

                {/* Canal badge */}
                <div style={{ marginBottom: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, color: meta.color, padding: '5px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                    {meta.label}
                  </span>
                </div>

                {medium && <Row label="Médium" value={medium === 'paid' ? '💰 Payant (paid)' : medium} />}
                {campaign && <Row label="Campaign ID" value={campaign} mono />}
                <Row label="Facebook Click" value={hasFbclid ? '✅ Oui (fbclid détecté)' : '— Non'} />
                {referrer && <Row label="Referrer" value={referrer} mono />}

                {!raw && (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Source inconnue ou directe.</div>
                )}

                {raw && (
                  <div style={{ marginTop: 10, borderTop: '1px dashed #e2e8f0', paddingTop: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source brute</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, wordBreak: 'break-all' }}>{raw}</div>
                  </div>
                )}
              </div>
            )
          })()}

        </div>

      </div>

    </div>

    {/* ── EDIT PANEL MODAL ── */}
    {showEdit && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex' }}>
        {/* Backdrop */}
        <div
          style={{ flex: 1, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowEdit(false)}
        />
        {/* Drawer */}
        <div style={{
          width: 480, maxWidth: '95vw', background: '#fff',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>✏️ Modifier la commande #{id}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Les modifications sont sauvegardées immédiatement</p>
            </div>
            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b', fontSize: '1.3rem' }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* CLIENT */}
            <section>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 12 }}>Informations Client</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Nom complet', key: 'guest_name', type: 'text' },
                  { label: 'Email', key: 'guest_email', type: 'email' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>📞 Téléphone 1</label>
                    <input
                      type="tel"
                      value={editForm.guest_phone || ''}
                      onChange={e => setEditForm({ ...editForm, guest_phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 4 }}>📞 Téléphone 2 (optionnel)</label>
                    <input
                      type="tel"
                      value={editForm.guest_phone2 || ''}
                      onChange={e => setEditForm({ ...editForm, guest_phone2: e.target.value })}
                      placeholder="2ème numéro"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f0fdf4' }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ADDRESS */}
            <section>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 12 }}>Adresse de livraison</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Adresse complète</label>
                  <textarea
                    rows={2}
                    value={editForm.shipping_address || ''}
                    onChange={e => setEditForm({ ...editForm, shipping_address: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Wilaya</label>
                    <input
                      type="text"
                      value={editForm.wilaya || ''}
                      onChange={e => setEditForm({ ...editForm, wilaya: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Commune / Ville</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ITEMS */}
            <section>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 12 }}>Articles existants</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editItems.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: item._qty == 0 ? '#fef2f2' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${item._qty == 0 ? '#fecaca' : '#e2e8f0'}`,
                    opacity: item._qty == 0 ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: item._qty == 0 ? 'line-through' : 'none' }}>{item.product_name}</div>
                      {item.variant_name && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.variant_name}</div>}
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{Number(item.price_at_purchase).toLocaleString('fr-DZ')} DA/u</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button
                        onClick={() => setEditItems(editItems.map((it, j) => j === i ? { ...it, _qty: Math.max(0, Number(it._qty) - 1) } : it))}
                        style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                      >−</button>
                      <input
                        type="number"
                        min="0"
                        value={item._qty}
                        onChange={e => setEditItems(editItems.map((it, j) => j === i ? { ...it, _qty: e.target.value } : it))}
                        style={{ width: 44, textAlign: 'center', padding: '4px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.9rem', fontWeight: 700 }}
                      />
                      <button
                        onClick={() => setEditItems(editItems.map((it, j) => j === i ? { ...it, _qty: Number(it._qty) + 1 } : it))}
                        style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}
                      >+</button>
                      {/* Supprimer direct */}
                      <button
                        title="Supprimer cet article"
                        onClick={() => setEditItems(editItems.map((it, j) => j === i ? { ...it, _qty: 0 } : it))}
                        style={{ width: 28, height: 28, border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                      >🗑️</button>
                    </div>
                  </div>
                ))}
                {editItems.some(i => i._qty == 0) && (
                  <div style={{ fontSize: '0.73rem', color: '#ef4444', textAlign: 'center', padding: '4px 0' }}>
                    ⚠️ Les articles rayés (quantité = 0) seront supprimés définitivement à l'enregistrement
                  </div>
                )}
              </div>

              {/* Ajouter un nouveau produit */}
              <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16a34a', marginBottom: 10, margin: '0 0 10px 0' }}>+ Ajouter un produit</h4>

                {/* Input de recherche */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={addSearch}
                    onChange={e => setAddSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                  />
                  {addSearching && <span style={{ position: 'absolute', right: 10, top: 9, fontSize: '0.72rem', color: '#64748b' }}>...</span>}
                  {addResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 200, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                      {addResults.slice(0, 8).map(p => (
                        <div key={p.id}
                          style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
                          onClick={() => addProductToNew(p)}
                        >
                          {p.images?.[0]?.image && <img src={p.images[0].image} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} alt="" />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{p.effective_price} DA</div>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>+ Ajouter</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Produits à ajouter */}
                {newItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {newItems.map((ni, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #86efac' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ {ni.product.name}</div>
                          {ni.product.variants?.length > 0 && (
                            <select
                              value={ni.variant?.id || ''}
                              onChange={e => {
                                const v = ni.product.variants.find(v => v.id === parseInt(e.target.value)) || null
                                setNewItems(newItems.map((n, j) => j === i ? { ...n, variant: v } : n))
                              }}
                              style={{ marginTop: 3, fontSize: '0.77rem', padding: '2px 6px', border: '1px solid #86efac', borderRadius: 4, background: '#f0fdf4', outline: 'none' }}
                            >
                              <option value="">— Teinte —</option>
                              {ni.product.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          )}
                          <div style={{ fontSize: '0.73rem', color: '#16a34a' }}>{ni.product.effective_price} DA/u</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => setNewItems(newItems.map((n, j) => j === i ? { ...n, quantity: Math.max(1, n.quantity - 1) } : n))}
                            style={{ width: 24, height: 24, border: '1px solid #86efac', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                          >−</button>
                          <span style={{ width: 26, textAlign: 'center', fontWeight: 700, fontSize: '0.88rem' }}>{ni.quantity}</span>
                          <button onClick={() => setNewItems(newItems.map((n, j) => j === i ? { ...n, quantity: n.quantity + 1 } : n))}
                            style={{ width: 24, height: 24, border: '1px solid #86efac', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                          >+</button>
                          <button onClick={() => setNewItems(newItems.filter((_, j) => j !== i))}
                            style={{ width: 24, height: 24, border: '1px solid #fecaca', borderRadius: 4, background: '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginLeft: 2 }}
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* NOTES */}
            <section>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>Notes internes</h4>
              <textarea
                rows={3}
                value={editForm.notes || ''}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notes visibles uniquement en admin..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </section>
          </div>

          {/* Footer buttons */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, background: '#f8fafc' }}>
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}
            >
              {editSaving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
            </button>
            <button
              onClick={() => setShowEdit(false)}
              style={{ padding: '12px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
