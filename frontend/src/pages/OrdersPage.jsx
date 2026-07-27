import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../api/orders'
import { useAuthStore } from '../store/authStore'
import './OrdersPage.css'

export default function OrdersPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000) // safety timeout
    getOrders()
      .then((res) => setOrders(res.data.results || res.data))
      .catch(() => setError(true))
      .finally(() => { clearTimeout(timer); setLoading(false) })
    return () => clearTimeout(timer)
  }, [])

  if (!user) return null

  return (
    <div className="orders-page page-enter">
      <div className="orders-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <h1 className="orders-title">Mes Commandes</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-avatar" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text skeleton-text--short" />
              </div>
              <div className="skeleton skeleton-badge" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="orders-empty">
          <p>Impossible de charger vos commandes. Vérifiez votre connexion.</p>
          <button onClick={() => window.location.reload()} className="btn btn-accent">Réessayer</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <p>Vous n'avez passé aucune commande pour le moment.</p>
          <Link to="/shop" className="btn btn-accent" id="orders-shop-btn">Découvrir nos produits</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card__header">
                <div>
                  <p className="order-id">Commande #{order.id}</p>
                  <p className="order-date">
                    Passée le {new Date(order.created_at).toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className={`order-status status-${order.status}`}>
                    {order.status_display}
                  </div>
                  {/* Badge Mylerz si expédié */}
                  {order.mylerz_barcode && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                      border: '1px solid #fed7aa',
                      borderRadius: 20,
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#c2410c',
                    }}>
                      📦 {order.mylerz_status || 'En cours de livraison'}
                    </div>
                  )}
                </div>
              </div>

              <div className="order-card__items">
                {order.items.map((item) => (
                  <div key={item.id} className="order-item">
                    <p className="order-item__name">
                      {item.quantity}x {item.product_name}
                      {item.variant_name && <span className="order-item__variant"> — {item.variant_name}</span>}
                    </p>
                    <p className="order-item__price">{parseFloat(item.subtotal).toLocaleString('fr-DZ')} DA</p>
                  </div>
                ))}
              </div>

              {/* Suivi Mylerz */}
              {order.mylerz_barcode && (
                <div style={{
                  margin: '0', padding: '20px 24px',
                  background: 'linear-gradient(135deg, #fff7ed 0%, #fff3e6 50%, #ffedd5 100%)',
                  borderTop: '1px solid #fed7aa',
                  borderBottom: '1px solid #fed7aa',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>🚚</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7c2d12' }}>Suivi Mylerz</div>
                      <div style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 600 }}>
                        {order.mylerz_status || 'Colis pris en charge'}
                      </div>
                    </div>
                    {/* Indicateur animé si en cours */}
                    {order.mylerz_status && !['Livré', 'Retourné', 'Annulé'].some(s => order.mylerz_status.toLowerCase().includes(s.toLowerCase())) && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: '#c2410c', animation: 'pulse 1.5s infinite',
                        }} />
                        <span style={{ fontSize: '0.72rem', color: '#c2410c', fontWeight: 600 }}>EN COURS</span>
                      </div>
                    )}
                  </div>

                  {/* Barre de progression */}
                  {(() => {
                    const s = (order.mylerz_status || '').toLowerCase()
                    const steps = [
                      { label: 'Confirmé', done: true },
                      { label: 'Enlevé', done: s.includes('enlev') || s.includes('transit') || s.includes('livr') },
                      { label: 'En transit', done: s.includes('transit') || s.includes('livr') },
                      { label: 'En livraison', done: s.includes('livraison') || s.includes('livré') },
                      { label: 'Livré', done: s.includes('livré') || s.includes('delivered') },
                    ]
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
                        {steps.map((step, i) => (
                          <>
                            <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: step.done ? '#c2410c' : '#fed7aa',
                                border: `2px solid ${step.done ? '#c2410c' : '#fdba74'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6rem', color: '#fff', fontWeight: 700,
                                transition: 'all 0.3s',
                              }}>{step.done ? '✓' : ''}</div>
                              <div style={{ fontSize: '0.6rem', color: step.done ? '#7c2d12' : '#fdba74', fontWeight: step.done ? 700 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {step.label}
                              </div>
                            </div>
                            {i < steps.length - 1 && (
                              <div key={`line-${i}`} style={{ flex: 1, height: 2, background: steps[i+1]?.done ? '#c2410c' : '#fed7aa', marginBottom: 16, transition: 'all 0.3s' }} />
                            )}
                          </>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Code barres */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.7)', borderRadius: 8,
                    padding: '8px 12px', border: '1px solid #fed7aa',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>N° Colis :</span>
                    <code style={{ fontSize: '0.8rem', color: '#7c2d12', fontWeight: 700, letterSpacing: '0.05em', flex: 1 }}>
                      {order.mylerz_barcode}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(order.mylerz_barcode); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#c2410c', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}
                      title="Copier le numéro"
                    >📋 Copier</button>
                  </div>
                </div>
              )}

              <div className="order-card__timeline" style={{ padding: '24px', borderBottom: '1px solid var(--color-gray-200)', background: '#fafafa' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: 16, letterSpacing: '0.05em' }}>Suivi de commande</h4>
                <div style={{ position: 'relative', paddingLeft: 12 }}>
                  <div style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 2, background: 'var(--color-gray-200)', zIndex: 0 }}></div>
                  
                  {order.history && order.history.length > 0 ? (
                    order.history.map((h, idx) => (
                      <div key={h.id} style={{ position: 'relative', zIndex: 1, paddingLeft: 24, marginBottom: idx === order.history.length - 1 ? 0 : 20 }}>
                        <div style={{ position: 'absolute', left: 0, top: 4, width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? 'var(--color-accent)' : 'var(--color-gray-300)', border: '2px solid #fff' }}></div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-black)', marginBottom: 2 }}>{h.status_display}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginBottom: 4 }}>
                          {new Date(h.created_at).toLocaleString('fr-DZ', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {h.notes && (
                          <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', padding: '8px 12px', borderRadius: 6, fontSize: '0.85rem', color: 'var(--color-gray-700)', marginTop: 8 }}>
                            {h.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ paddingLeft: 24, fontSize: '0.85rem', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>Aucun historique disponible.</div>
                  )}
                </div>
              </div>

              <div className="order-card__footer">
                <div className="order-address">
                  <strong>Livraison:</strong> {order.shipping_address}, {order.wilaya}
                </div>
                <div className="order-total">
                  <span>Total:</span>
                  <strong>{parseFloat(order.total).toLocaleString('fr-DZ')} DA</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
