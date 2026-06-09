import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmé',
  shipped: 'En livraison', fulfilled: 'Fulfilled', cancelled: 'Annulée', returned: 'Retournée',
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

  const load = () => {
    setLoading(true)
    adminClient.get(`/admin/orders/${id}/`)
      .then(r => setDetail(r.data))
      .catch(e => {
        alert('Erreur: Commande introuvable')
        navigate('/admin-panel/orders')
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
      alert(e.response?.data?.message || 'Erreur lors de la création du colis.')
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
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur de suivi.')
    } finally {
      setMylerzLoading(false)
    }
  }

  const handleMylerzCancel = async () => {
    if (!window.confirm('Voulez-vous vraiment annuler cet envoi sur Mylerz ?')) return
    setMylerzLoading(true)
    try {
      await adminClient.post(`/admin/orders/${id}/mylerz_cancel/`)
      alert('Envoi annulé avec succès.')
      load()
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur lors de l\'annulation.')
    } finally {
      setMylerzLoading(false)
    }
  }

  if (loading) return <div className="admin-loading"><div className="spin" /><span>Chargement...</span></div>
  if (!detail) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate('/admin-panel/orders')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', padding: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Détails Commande n°{detail.id}</h2>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Paiement à la livraison — {new Date(detail.created_at).toLocaleString('fr-DZ')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge ${STATUS_BADGE[detail.status]}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{STATUS_LABELS[detail.status]}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 3 Info Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Général</h4>
              <div style={{ fontSize: '0.9rem', marginBottom: 6 }}><strong style={{ color: '#475569' }}>Date:</strong> {new Date(detail.created_at).toLocaleDateString('fr-DZ')}</div>
              <div style={{ fontSize: '0.9rem', marginBottom: 6 }}><strong style={{ color: '#475569' }}>Client:</strong> {detail.user ? 'Inscrit' : 'Invité'}</div>
              <div style={{ fontSize: '0.9rem', marginTop: 12 }}>
                <strong style={{ color: '#475569', display: 'block', marginBottom: 4 }}>Changer l'état:</strong>
                <select className="status-select" value={detail.status} onChange={e => handleStatus(e.target.value)} style={{ width: '100%', padding: 8 }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Facturation</h4>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: 4 }}>
                {detail.customer_name}
                {detail.is_blacklisted && <span className="badge badge-danger" style={{marginLeft: 6, fontSize: '0.65rem', padding: '2px 4px'}}>BLACKLIST</span>}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 4 }}>{detail.shipping_address}</div>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 12 }}>{detail.wilaya} - {detail.city}</div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {detail.guest_email || '—'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                {detail.guest_phone || '—'}
              </div>
            </div>

            <div className="admin-card" style={{ padding: 16, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>Expédition</h4>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 4 }}>{detail.shipping_address}</div>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 16 }}>{detail.wilaya} - {detail.city}</div>
              
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 2 }}>Transporteur</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0f172a', marginBottom: 8 }}>{detail.delivery_company_name || 'Non spécifié'}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 2 }}>Type de livraison</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>{detail.delivery_type === 'desk' ? 'Point de retrait (Bureau)' : 'À domicile'}</div>
              </div>
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
                  <span>{Number(detail.total).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem', color: '#475569' }}>
                  <span>Frais de livraison:</span>
                  <span>{Number(detail.delivery_cost || 0).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  <span>Total de la commande:</span>
                  <span>{(Number(detail.total) + Number(detail.delivery_cost || 0)).toLocaleString('fr-DZ')} DA</span>
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
                  navigate('/admin-panel/orders')
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
                   <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8, marginBottom: 4 }}>Statut Mylerz:</div>
                   <div style={{ fontWeight: 600, color: '#3b82f6' }}>{detail.mylerz_status || 'En attente'}</div>
                 </div>

                 <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                   <button className="btn btn-black" style={{ width: '100%', fontSize: '0.85rem' }} onClick={handleMylerzTrack} disabled={mylerzLoading}>
                     🔍 Suivre le colis
                   </button>
                   {(!detail.mylerz_status || !detail.mylerz_status.toLowerCase().includes('cancel')) && (
                     <button className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem', color: '#dc3545', borderColor: '#dc3545' }} onClick={handleMylerzCancel} disabled={mylerzLoading}>
                       ❌ Annuler l'envoi
                     </button>
                   )}
                 </div>

                 {/* Tracking info display */}
                 {showTracking && trackingData && (
                   <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                     <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Historique Mylerz :</div>
                     {trackingData.length > 0 ? trackingData.map((t, idx) => (
                       <div key={idx} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #cbd5e1' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{t.Status || t.status}</div>
                         <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(t.Date || t.date).toLocaleString('fr-DZ')}</div>
                       </div>
                     )) : <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Aucun suivi disponible.</div>}
                   </div>
                 )}
               </div>
             ) : (
               <div>
                 <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
                   Aucun colis généré pour cette commande.
                 </div>
                 <button className="btn btn-black" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} onClick={handleMylerzShip} disabled={mylerzLoading}>
                   📦 Envoyer à Mylerz
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
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: 2 }}>{h.status_display}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                      {new Date(h.created_at).toLocaleString('fr-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {h.notes && (
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

        </div>

      </div>
    </div>
  )
}
