import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem)

  const hasVariants = product.variants?.length > 0
  const isPromo = product.is_promo
  const isNew = product.is_new

  const handleAddToCart = (e) => {
    e.preventDefault()
    addItem(product, null, 1)

    // Quick visual feedback
    const btn = e.currentTarget
    btn.classList.add('added')
    setTimeout(() => btn.classList.remove('added'), 1200)
  }

  return (
    <article className="product-card">
      <Link to={`/produit/${product.slug}`} className="product-card__image-wrap" id={`product-${product.id}`}>
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="product-card__img" loading="lazy" />
        ) : (
          <div className="product-card__placeholder">
            <svg width="40" height="40" fill="none" stroke="var(--color-gray-300)" strokeWidth="1.2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        <div className="product-card__badges">
          {isPromo && <span className="badge badge-promo">Promo</span>}
          {isNew && <span className="badge badge-new">Nouveau</span>}
        </div>
        <div className="product-card__actions">
          <button
            className="product-card__add-btn"
            onClick={handleAddToCart}
            title="Ajouter au panier"
            id={`add-cart-${product.id}`}
          >
            {hasVariants ? (
              <span>Choisir</span>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <span>Ajouter</span>
              </>
            )}
          </button>
        </div>
      </Link>
      <div className="product-card__body">
        <p className="product-card__category">{product.category_name}</p>
        <h3 className="product-card__name">
          <Link to={`/produit/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__pricing">
          {isPromo ? (
            <>
              <span className="product-card__price product-card__price--promo">
                {parseFloat(product.promo_price).toLocaleString('fr-DZ')} DA
              </span>
              <span className="product-card__price product-card__price--original">
                {parseFloat(product.price).toLocaleString('fr-DZ')} DA
              </span>
            </>
          ) : (
            <span className="product-card__price">
              {parseFloat(product.price).toLocaleString('fr-DZ')} DA
            </span>
          )}
        </div>
        {product.avg_rating && (
          <div className="product-card__rating">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={s <= Math.round(product.avg_rating) ? 'star star--filled' : 'star'}>★</span>
            ))}
            <span className="product-card__rating-num">({product.avg_rating})</span>
          </div>
        )}
      </div>
    </article>
  )
}
