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
    <main className="orders-page page-enter container">
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
