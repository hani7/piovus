import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import './CartPage.css'

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore()
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

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
          <div className="cart-summary__row">
            <span>Livraison</span>
            <span className="cart-summary__muted">Calculée à l'étape suivante</span>
          </div>
          <div className="cart-summary__total">
            <span>Total</span>
            <span>{total.toLocaleString('fr-DZ')} DA</span>
          </div>
          <Link to="/checkout" className="btn btn-accent cart-summary__btn" id="cart-page-checkout">Commander</Link>
          <Link to="/shop" className="cart-summary__continue" id="cart-page-continue">Continuer mes achats</Link>
        </aside>
      </div>
    </main>
  )
}
