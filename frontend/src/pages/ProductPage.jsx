import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct } from '../api/products'
import { useCartStore } from '../store/cartStore'
import './ProductPage.css'

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    setLoading(true)
    getProduct(slug)
      .then((r) => {
        setProduct(r.data)
        if (r.data.variants?.length > 0) setSelectedVariant(r.data.variants[0])
      })
      .catch(() => setError('Produit introuvable.'))
      .finally(() => setLoading(false))
  }, [slug])

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return <div className="product-page-loading"><div className="spinner" /></div>
  if (error || !product) return (
    <div className="product-page-error container">
      <p>{error || 'Produit non trouvé.'}</p>
      <Link to="/shop" className="btn btn-accent">Retour à la boutique</Link>
    </div>
  )

  const images = product.images?.length > 0
    ? product.images
    : product.thumbnail ? [{ image: product.thumbnail, alt: product.name }] : []

  return (
    <main className="product-page page-enter">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="product-page__breadcrumb">
          <Link to="/">Accueil</Link> /
          <Link to="/shop">Produits</Link> /
          {product.category_name && <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link>}
          / <span>{product.name}</span>
        </nav>

        <div className="product-page__layout">
          {/* ── Images ─────────────────────────────── */}
          <div className="product-gallery">
            <div className="product-gallery__main">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.image || product.thumbnail}
                  alt={images[selectedImage]?.alt || product.name}
                />
              ) : (
                <div className="product-gallery__placeholder">
                  <svg width="60" height="60" fill="none" stroke="var(--color-gray-300)" strokeWidth="1.2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}
              <div className="product-gallery__badges">
                {product.is_promo && <span className="badge badge-promo">Promo -{Math.round((1 - product.promo_price/product.price)*100)}%</span>}
                {product.is_new && <span className="badge badge-new">Nouveau</span>}
              </div>
            </div>
            {images.length > 1 && (
              <div className="product-gallery__thumbs">
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`product-gallery__thumb ${i === selectedImage ? 'active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                    id={`thumb-${i}`}
                  >
                    <img src={img.image} alt={img.alt || product.name} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ───────────────────────────────── */}
          <div className="product-info">
            <p className="product-info__category">
              <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link>
            </p>
            <h1 className="product-info__name">{product.name}</h1>

            {/* Rating */}
            {product.avg_rating && (
              <div className="product-info__rating">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className={s <= Math.round(product.avg_rating) ? 'star star--filled' : 'star'}>★</span>
                ))}
                <span>{product.avg_rating} ({product.review_count} avis)</span>
              </div>
            )}

            {/* Price */}
            <div className="product-info__pricing">
              {product.is_promo ? (
                <>
                  <span className="product-info__price product-info__price--promo">
                    {parseFloat(product.promo_price).toLocaleString('fr-DZ')} DA
                  </span>
                  <span className="product-info__price product-info__price--original">
                    {parseFloat(product.price).toLocaleString('fr-DZ')} DA
                  </span>
                </>
              ) : (
                <span className="product-info__price">
                  {parseFloat(product.price).toLocaleString('fr-DZ')} DA
                </span>
              )}
            </div>

            {/* Variants (color swatches) */}
            {product.variants?.length > 0 && (
              <div className="product-info__variants">
                <p className="product-info__variant-label">
                  Teinte: <strong>{selectedVariant?.name}</strong>
                </p>
                <div className="product-info__swatches">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      className={`swatch ${selectedVariant?.id === v.id ? 'swatch--active' : ''}`}
                      style={{ background: v.color_hex || '#cccccc' }}
                      onClick={() => setSelectedVariant(v)}
                      title={v.name}
                      id={`variant-${v.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="product-info__actions">
              <div className="product-info__qty">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} id="qty-minus">−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} id="qty-plus">+</button>
              </div>
              <button
                className={`btn btn-accent product-info__add-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                id="add-to-cart-btn"
              >
                {product.stock === 0 ? 'Rupture de stock' : added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
              </button>
            </div>

            {/* Stock indicator */}
            <p className="product-info__stock">
              {product.stock > 10
                ? <span className="stock-ok">En stock</span>
                : product.stock > 0
                ? <span className="stock-low">Plus que {product.stock} en stock</span>
                : <span className="stock-none">Rupture de stock</span>
              }
            </p>

            {/* Description */}
            <div className="product-info__desc">
              <h3>Description</h3>
              <p>{product.description || 'Aucune description disponible.'}</p>
            </div>

            {/* Delivery info */}
            <div className="product-info__delivery">
              <div className="delivery-row">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span>Livraison dans toute l'Algérie</span>
              </div>
              <div className="delivery-row">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>Paiement à la livraison (COD)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews ────────────────────────────── */}
        {product.reviews?.length > 0 && (
          <section className="product-reviews">
            <h2 className="section-title" style={{textAlign:'left', fontSize:'1.6rem'}}>Avis Clients</h2>
            <div className="reviews-grid">
              {product.reviews.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-card__header">
                    <div className="review-card__avatar">
                      {r.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="review-card__name">{r.username}</p>
                      <div className="review-card__stars">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={s <= r.rating ? 'star star--filled' : 'star'}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="review-card__comment">{r.comment}</p>
                  <p className="review-card__date">{new Date(r.created_at).toLocaleDateString('fr-DZ')}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
