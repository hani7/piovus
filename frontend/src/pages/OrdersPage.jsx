import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getOrders } from '../api/orders'
import { useAuthStore } from '../store/authStore'
import './OrdersPage.css'

export default function OrdersPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    if (!user) {
      navigate('/compte')
      return
    }
    getOrders()
      .then((res) => setOrders(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (!user) return null

  return (
    <main className="orders-page page-enter container" style={{ paddingTop: '120px' }}>
      <div className="orders-header">
        <h1 className="orders-title">Mes Commandes</h1>
        <Link to="/compte" className="btn btn-outline" id="orders-back-btn">Retour au compte</Link>
      </div>

      {loading ? (
        <div className="spinner" />
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
                <div className={`order-status status-${order.status}`}>
                  {order.status_display}
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
    </main>
  )
}
