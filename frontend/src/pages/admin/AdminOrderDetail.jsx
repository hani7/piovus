import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'
import { Printer, RefreshCw } from 'lucide-react'

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmé',
  shipped: 'En livraison', fulfilled: 'Livrée', cancelled: 'Annulée', returned: 'Retournée',
}

const STATUS_BADGE = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  shipped: 'badge-shipped', fulfilled: 'badge-fulfilled', cancelled: 'badge-cancelled', returned: 'badge-returned',
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

  // Edit panel state
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editItems, setEditItems] = useState([])
  const [editSaving, setEditSaving] = useState(false)

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
    setShowEdit(true)
  }

  const handleEditSave = async () => {
    setEditSaving(true)
    try {
      const payload = {
        ...editForm,
        items: editItems.map(it => ({ id: it.id, quantity: Number(it._qty) })),
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

  const load = () => {
    setLoading(true)
    adminClient.get(`/admin/orders/${id}/`)
      .then(r => setDetail(r.data))
      .catch(e => {
        alert('Erreur: Commande introuvable')
        navigate('/piove-secure-2026/orders')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

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
      setTrackingData(res.data.tracking)
      setShowTracking(true)
      // also update status from tracking
      if (res.data.tracking && res.data.tracking.length > 0) {
        detail.mylerz_status = res.data.tracking[0].Status || res.data.tracking[0].status
        setDetail({...detail})
      }
      alert('Statut actualisé.')
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
