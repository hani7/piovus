import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import client from '../api/client'
import './CartPage.css'

export default function CartPage() {
  const { items, updateQuantity, removeItem, coupon, applyCoupon, removeCoupon } = useCartStore()
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    setCouponError('')
    setIsApplying(true)
    try {
      const payload = {
        code: couponCode,
        cart_total: total,
        cart_items: items.map(i => ({ price: i.price, quantity: i.quantity }))
      }
      const res = await client.post('/apply-coupon/', payload)
      if (res.data.success) {
        applyCoupon(res.data)
        setCouponCode('')
      }
    } catch (err) {
      console.error(err)
      setCouponError(err.response?.data?.error || "Erreur lors de l'application du code.")
    } finally {
      setIsApplying(false)
    }
  }

  if (items.length === 0) {
    return (
      <main className="cart-page page-enter container">
        <div className="cart-page__empty">
          <h2>Votre panier est vide</h2>
          <p>Découvrez nos produits et ajoutez-les à votre panier.</p>
          <Link to="/shop" className="btn btn-accent" id="cart-page-shop">Découvrir nos produits</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="cart-page page-enter container">
      <h1 className="cart-page__title">Mon Panier</h1>

      <div className="cart-page__layout">
        <div className="cart-page__items">
          <div className="cart-table-header">
            <span>Produit</span>
            <span>Prix</span>
            <span>Quantité</span>
            <span>Total</span>
            <span></span>
          </div>
          {items.map((item) => (
            <div key={item.key} className="cart-row">
              <div className="cart-row__product">
                <div className="cart-row__img">
                  {item.product.thumbnail ? (
                    <img src={item.product.thumbnail} alt={item.product.name} />
                  ) : <div className="cart-row__placeholder" />}
                </div>
                <div>
                  <Link to={`/produit/${item.product.slug}`} className="cart-row__name">{item.product.name}</Link>
                  {item.variant && <p className="cart-row__variant">Teinte: {item.variant.name}</p>}
                </div>
              </div>
              <div className="cart-row__price">
                {item.price.toLocaleString('fr-DZ')} DA
              </div>
              <div className="cart-row__qty">
                <div className="qty-control">
                  <button onClick={() => updateQuantity(item.key, item.quantity - 1)} id={`cart-minus-${item.key}`}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.key, item.quantity + 1)} id={`cart-plus-${item.key}`}>+</button>
                </div>
              </div>
              <div className="cart-row__total">
                {(item.price * item.quantity).toLocaleString('fr-DZ')} DA
              </div>
              <div className="cart-row__action">
                <button className="cart-row__remove" onClick={() => removeItem(item.key)} aria-label="Supprimer" id={`cart-remove-${item.key}`}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-page__summary">
          <h3>Récapitulatif</h3>
          <div className="cart-summary__row">
            <span>Sous-total</span>
            <span>{total.toLocaleString('fr-DZ')} DA</span>
          </div>

          <div style={{ marginTop: 16, marginBottom: 16 }}>
            {coupon ? (
              <div style={{ background: 'var(--color-gray-100)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{coupon.code}</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                    -{coupon.discount_amount.toLocaleString('fr-DZ')} DA
                  </div>
                </div>
                <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: 'var(--admin-danger)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Code Promo" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: 4, outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" disabled={isApplying} style={{ padding: '8px 16px' }}>
                  {isApplying ? '...' : 'Appliquer'}
                </button>
              </form>
            )}
            {couponError && <p style={{ color: 'var(--admin-danger)', fontSize: '0.85rem', marginTop: 8 }}>{couponError}</p>}
          </div>

          <div className="cart-summary__row">
            <span>Livraison</span>
            <span className="cart-summary__muted">Calculée à l'étape suivante</span>
          </div>
          <div className="cart-summary__total">
            <span>Total</span>
            <span>{coupon ? coupon.new_total.toLocaleString('fr-DZ') : total.toLocaleString('fr-DZ')} DA</span>
          </div>

          {total < 1500 && (
            <div style={{ padding: '10px', background: 'rgba(255,0,0,0.1)', color: 'var(--admin-danger)', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold' }}>
              Le montant minimum de commande est de 1 500 DA.<br/>
              Il vous manque {(1500 - total).toLocaleString('fr-DZ')} DA.
            </div>
          )}

          {total < 1500 ? (
            <button className="btn btn-accent cart-summary__btn" disabled style={{ width: '100%' }}>Commander</button>
          ) : (
            <Link to="/checkout" className="btn btn-accent cart-summary__btn" id="cart-page-checkout">Commander</Link>
          )}

          <Link to="/shop" className="cart-summary__continue" id="cart-page-continue">Continuer mes achats</Link>
        </aside>
      </div>
    </main>
  )
}
