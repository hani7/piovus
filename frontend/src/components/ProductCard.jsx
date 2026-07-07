import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { ShoppingBag, Eye, Zap } from 'lucide-react'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)

  const hasVariants = product.variants?.length > 0
  const isPromo = product.is_promo || product.is_promotion
  const isNew = product.is_new
  const isBestSeller = product.is_bestseller
  const isB2B = user?.profile?.is_b2b
  const b2bPrice = parseFloat(product.b2b_price || product.effective_price * (product.units_per_carton || 1))

  const handleAddToCart = (e) => {
    e.preventDefault()
    if (hasVariants) {
      navigate(`/produit/${product.slug}`)
      return
    }
    addItem(product, null, 1)
    const btn = e.currentTarget
    btn.classList.add('added')
    setTimeout(() => btn.classList.remove('added'), 1200)
  }

  const handleBuyNow = (e) => {
    e.preventDefault()
    if (hasVariants) {
      navigate(`/produit/${product.slug}`)
      return
    }
    addItem(product, null, 1)
    navigate('/cart')
  }

  return (
    <article className="product-card">
      <div className="product-card__image-wrap" id={`product-${product.id}`}>
        <Link to={`/produit/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
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
        </Link>
        <div className="product-card__badges">
          {isPromo && <span className="badge badge-promo">Promo</span>}
          {isNew && <span className="badge badge-new">Nouveau</span>}
          {isBestSeller && <span className="badge badge-bestseller">Best Seller</span>}
        </div>
      </div>
      <div className="product-card__body">
        <p className="product-card__category">{product.categories?.[0]?.name}</p>
        <h3 className="product-card__name">
          <Link to={`/produit/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__pricing">
          {isB2B ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="product-card__price" style={{ color: 'var(--admin-gold)' }}>
                {b2bPrice.toLocaleString('fr-DZ')} DA
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 2 }}>
                Le carton ({product.units_per_carton || 1} pcs)
              </span>
            </div>
          ) : isPromo ? (
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
        <div className="product-card__actions">
          <button className="product-card__action-btn" title="Acheter maintenant" onClick={(e) => { e.preventDefault(); handleBuyNow(e); }}>
            <Zap size={18} />
          </button>
          <button className="product-card__action-btn" title="Ajouter au panier" onClick={(e) => { e.preventDefault(); handleAddToCart(e); }}>
            <ShoppingBag size={18} />
          </button>
          <Link to={`/produit/${product.slug}`} className="product-card__action-btn" title="Aperçu">
            <Eye size={18} />
          </Link>
        </div>
      </div>
    </article>
  )
}
