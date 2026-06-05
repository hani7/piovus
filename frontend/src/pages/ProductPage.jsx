import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct, getRelatedProducts } from '../api/products'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import ProductCard from '../components/ProductCard'
import './ProductPage.css'

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [packaging, setPackaging] = useState('boite')
  const [added, setAdded] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [selectedRelated, setSelectedRelated] = useState([])
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const isB2B = user?.profile?.is_b2b

  useEffect(() => {
    if (product && isB2B && product.b2b_min_stock > 1) {
      setQuantity(Math.max(quantity, product.b2b_min_stock))
    }
  }, [product, isB2B])

  useEffect(() => {
    setLoading(true)
    getProduct(slug)
      .then((r) => {
        setProduct(r.data)
        if (r.data.variants?.length > 0) setSelectedVariant(r.data.variants[0])
      })
      .catch(() => setError('Produit introuvable.'))
      .finally(() => setLoading(false))

    getRelatedProducts(slug)
      .then((r) => setRelatedProducts(r))
      .catch(console.error)
  }, [slug])

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity, isB2B ? packaging : 'boite')
    
    selectedRelated.forEach(rpId => {
      const rp = product.related_products?.find(p => p.id === rpId)
      if (rp) addItem(rp, null, 1)
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    setSelectedRelated([])
  }

  const handleVariantSelect = (v) => {
    setSelectedVariant(v)
    if (v.image) setSelectedImage(-1)
  }

  const images = product?.images?.length > 0
    ? product.images
    : product?.thumbnail ? [{ image: product.thumbnail, alt: product.name }] : []

  useEffect(() => {
    if (images.length > 1) {
      const timer = setInterval(() => {
        setSelectedImage((prev) => {
          if (prev === -1) return 0
          return prev < images.length - 1 ? prev + 1 : 0
        })
      }, 4000)
      return () => clearInterval(timer)
    }
  }, [images.length])

  if (loading) return <div className="product-page-loading"><div className="spinner" /></div>
  if (error || !product) return (
    <div className="product-page-error container">
      <p>{error || 'Produit non trouvé.'}</p>
      <Link to="/shop" className="btn btn-accent">Retour à la boutique</Link>
    </div>
  )

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
              {images.length > 0 || selectedVariant?.image ? (
                <>
                  {selectedImage === -1 && selectedVariant?.image ? (
                    <img src={selectedVariant.image} alt={selectedVariant.name} />
                  ) : images[selectedImage]?.video ? (
                    <video 
                      src={images[selectedImage].video} 
                      poster={images[selectedImage].image} 
                      controls 
                      autoPlay 
                      loop 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={images[selectedImage]?.image || product.thumbnail}
                      alt={images[selectedImage]?.alt || product.name}
                    />
                  )}
                  {images.length > 1 && selectedImage !== -1 && (
                    <>
                      <button className="carousel-btn prev" onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1)}>‹</button>
                      <button className="carousel-btn next" onClick={() => setSelectedImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0)}>›</button>
                    </>
                  )}
                </>
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
                    {img.video && (
                      <div className="thumb-video-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ───────────────────────────────── */}
          <div className="product-info">
            <div className="product-info__header">
              <p className="product-info__category">
                <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link>
              </p>
              <div className="product-info__share">
                <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Découvrez ce produit : ' + product.name + ' - ' + window.location.href)}`, '_blank')} title="Partager sur WhatsApp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
                <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(product.name)}`, '_blank')} title="Partager sur Telegram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
                <button onClick={() => window.open(`fb-messenger://share/?link=${encodeURIComponent(window.location.href)}`, '_blank')} title="Partager sur Messenger">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.92 1.48 5.51 3.8 7.18V22l3.46-1.9c1.07.29 2.22.45 3.4.45 5.52 0 10-4.14 10-9.25C22 6.14 17.52 2 12 2zm1.09 12.39-2.92-3.13-5.69 3.13 6.24-6.6 3.01 3.13 5.59-3.13-6.23 6.6z"/></svg>
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Lien copié !') }} title="Copier le lien">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </button>
              </div>
            </div>
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
              {isB2B ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Boîte */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px', border: packaging === 'boite' ? '2px solid var(--color-accent)' : '1px solid var(--color-gray-200)', borderRadius: 8 }}>
                    <input type="radio" name="packaging" value="boite" checked={packaging === 'boite'} onChange={() => setPackaging('boite')} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 'bold' }}>Par boîte (Unité)</span>
                      <div style={{ color: 'var(--admin-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {product.b2b_promo_price_box ? (
                          <>
                            <span>{parseFloat(product.b2b_promo_price_box).toLocaleString('fr-DZ')} DA</span>
                            <span style={{ textDecoration: 'line-through', color: 'var(--color-gray-500)', fontSize: '0.9rem', marginLeft: 8 }}>{parseFloat(product.b2b_price_box || product.b2b_price || product.effective_price).toLocaleString('fr-DZ')} DA</span>
                          </>
                        ) : (
                          <span>{parseFloat(product.b2b_price_box || product.b2b_price || product.effective_price).toLocaleString('fr-DZ')} DA</span>
                        )}
                      </div>
                    </div>
                  </label>
                  {/* Carton */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px', border: packaging === 'carton' ? '2px solid var(--color-accent)' : '1px solid var(--color-gray-200)', borderRadius: 8 }}>
                    <input type="radio" name="packaging" value="carton" checked={packaging === 'carton'} onChange={() => setPackaging('carton')} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 'bold' }}>Par carton ({product.units_per_carton || 1} pcs)</span>
                      <div style={{ color: 'var(--admin-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {product.b2b_promo_price_carton ? (
                          <>
                            <span>{parseFloat(product.b2b_promo_price_carton).toLocaleString('fr-DZ')} DA</span>
                            <span style={{ textDecoration: 'line-through', color: 'var(--color-gray-500)', fontSize: '0.9rem', marginLeft: 8 }}>{parseFloat(product.b2b_price_carton || product.b2b_price || (product.effective_price * (product.units_per_carton || 1))).toLocaleString('fr-DZ')} DA</span>
                          </>
                        ) : (
                          <span>{parseFloat(product.b2b_price_carton || product.b2b_price || (product.effective_price * (product.units_per_carton || 1))).toLocaleString('fr-DZ')} DA</span>
                        )}
                      </div>
                    </div>
                  </label>
                  
                  {product.b2b_min_stock > 1 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-warning)', fontWeight: 'bold' }}>
                      Quantité minimale de commande : {product.b2b_min_stock}
                    </div>
                  )}
                </div>
              ) : product.is_promo ? (
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
                      style={{
                        background: v.color_hex?.startsWith('http')
                          ? `url(${v.color_hex}) center/cover`
                          : (v.color_hex || '#cccccc')
                      }}
                      onClick={() => handleVariantSelect(v)}
                      title={v.name}
                      id={`variant-${v.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Products Checkboxes */}
            {product.related_products?.length > 0 && (
              <div className="product-info__upsell" style={{ marginTop: '20px', padding: '15px', background: 'var(--color-gray-100)', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Produits recommandés avec cet article :</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {product.related_products.map(rp => (
                    <label key={`upsell-${rp.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedRelated.includes(rp.id)} 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRelated([...selectedRelated, rp.id])
                          else setSelectedRelated(selectedRelated.filter(id => id !== rp.id))
                        }}
                      />
                      {rp.thumbnail && (
                        <img src={rp.thumbnail} alt={rp.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      )}
                      <span style={{ flex: 1 }}>{rp.name}</span>
                      <strong style={{ color: 'var(--color-accent)' }}>{Number(rp.effective_price || rp.price).toLocaleString('fr-DZ')} DA</strong>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="product-info__actions">
              <div className="product-info__qty">
                <button onClick={() => setQuantity(Math.max(isB2B && product.b2b_min_stock ? product.b2b_min_stock : 1, quantity - 1))} id="qty-minus">−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} id="qty-plus">+</button>
              </div>
              <button
                className={`btn btn-accent product-info__add-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                id="add-to-cart-btn"
              >
                {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
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

        {/* ── Related Products ───────────────────── */}
        {relatedProducts.length > 0 && (
          <section className="product-related" style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid var(--color-gray-200)' }}>
            <h2 className="section-title" style={{textAlign:'left', fontSize:'1.6rem'}}>Vous aimerez aussi</h2>
            <div className="related-products-grid" style={{ marginTop: '20px' }}>
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
