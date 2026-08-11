import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import './CartDrawer.css'

// Regroupe les articles d'une même collection (même product.id, plusieurs lignes)
function groupCartItems(items) {
  const collectionMap = {}
  const result = []
  const pushed = new Set()

  items.forEach((item) => {
    const pid = item.product.id
    const siblings = items.filter(i => i.product.id === pid)
    if (siblings.length > 1) {
      // C'est une collection — regrouper
      if (!collectionMap[pid]) {
        collectionMap[pid] = { type: 'collection', product: item.product, items: [], key: `coll-${pid}` }
        result.push(collectionMap[pid])
      }
      collectionMap[pid].items.push(item)
    } else {
      if (!pushed.has(item.key)) {
        pushed.add(item.key)
        result.push({ type: 'single', item })
      }
    }
  })
  return result
}

export default function CartDrawer({ open, onClose }) {
  const { items, removeItem, updateQuantity } = useCartStore()
  const navigate = useNavigate()

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const grouped = groupCartItems(items)

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      <div className={`cart-overlay ${open ? 'cart-overlay--open' : ''}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? 'cart-drawer--open' : ''}`}>
        <div className="cart-drawer__header">
          <h2>Mon Panier <span className="cart-drawer__count">({items.reduce((n,i) => n+i.quantity,0)})</span></h2>
          <button onClick={onClose} className="cart-drawer__close" id="cart-close-btn">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <svg width="60" height="60" fill="none" stroke="var(--color-gray-300)" strokeWidth="1.2" viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <p>Votre panier est vide</p>
            <Link to="/shop" onClick={onClose} className="btn btn-accent">Découvrir nos produits</Link>
            <Link to="/shop?best_sellers=true" onClick={onClose} className="btn btn-outline" style={{ marginTop: 10 }}>⭐ Nos Best Sellers</Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer__items">
              {grouped.map((group) => {

                /* ── Collection groupée ── */
                if (group.type === 'collection') {
                  const collTotal = group.items.reduce((s, i) => s + i.price * i.quantity, 0)
                  return (
                    <div key={group.key} className="cart-item cart-item--collection">
                      <div className="cart-item__img">
                        {group.product.thumbnail
                          ? <img src={group.product.thumbnail} alt={group.product.name} />
                          : <div className="cart-item__placeholder" />
                        }
                      </div>
                      <div className="cart-item__info" style={{ flex: 1 }}>
                        <p className="cart-item__name">{group.product.name}</p>
                        {/* Chips des teintes sélectionnées */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {group.items.map(i => (
                            <span key={i.key} style={{
                              fontSize: '0.72rem', background: '#f1f5f9',
                              borderRadius: 4, padding: '2px 6px', color: '#475569',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}>
                              {i.variant?.name || '—'}
                              <button
                                onClick={() => removeItem(i.key)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 700, padding: 0, fontSize: '0.85rem', lineHeight: 1 }}
                                title="Retirer ce choix"
                              >×</button>
                            </span>
                          ))}
                        </div>
                        <p className="cart-item__price" style={{ marginTop: 6 }}>
                          {collTotal.toLocaleString('fr-DZ')} DA
                        </p>
                      </div>
                    </div>
                  )
                }

                /* ── Article simple ── */
                const { item } = group
                return (
                  <div key={item.key} className="cart-item">
                    <div className="cart-item__img">
                      {item.product.thumbnail
                        ? <img src={item.product.thumbnail} alt={item.product.name} />
                        : <div className="cart-item__placeholder" />
                      }
                    </div>
                    <div className="cart-item__info">
                      <p className="cart-item__name">{item.product.name}</p>
                      {item.variant && <p className="cart-item__variant">{item.variant.name}</p>}
                      <p className="cart-item__price">{item.price.toLocaleString('fr-DZ')} DA</p>
                    </div>
                    <div className="cart-item__controls">
                      <div className="qty-control">
                        <button onClick={() => updateQuantity(item.key, item.quantity - 1)} id={`qty-minus-${item.key}`}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.key, item.quantity + 1)} id={`qty-plus-${item.key}`}>+</button>
                      </div>
                      <button className="cart-item__remove" onClick={() => removeItem(item.key)} id={`remove-${item.key}`}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__subtotal">
                <span>Sous-total</span>
                <span className="cart-drawer__total-price">{total.toLocaleString('fr-DZ')} DA</span>
              </div>
              <p className="cart-drawer__shipping">+ Frais de livraison calculés à la commande</p>

              {total < 1500 && (
                <div style={{ padding: '10px', background: 'rgba(255,0,0,0.1)', color: 'var(--admin-danger)', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold' }}>
                  Le montant minimum de commande est de 1 500 DA.<br/>
                  Il vous manque {(1500 - total).toLocaleString('fr-DZ')} DA.
                </div>
              )}

              <button className="btn btn-accent" style={{width:'100%', marginBottom:'10px'}} onClick={handleCheckout} disabled={total < 1500} id="checkout-btn">
                Commander maintenant
              </button>
              <Link to="/cart" onClick={onClose} className="btn btn-outline" style={{width:'100%'}} id="view-cart-btn">
                Voir le panier
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
