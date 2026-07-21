import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { getProduct, getRelatedProducts } from '../api/products'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { useWishlistStore } from '../store/wishlistStore'
import ProductCard from '../components/ProductCard'
import ProductGallery from '../components/ProductGallery'
import ProductInfo from '../components/ProductInfo'
import ProductReviews from '../components/ProductReviews'
import PageSEO from '../components/PageSEO'
import './ProductPage.css'

export default function ProductPage() {
  const { slug } = useParams()
  const location = useLocation()
  const initialProduct = location.state?.initialProduct

  const [product, setProduct] = useState(initialProduct || null)
  const [loading, setLoading] = useState(!initialProduct)
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
  const { toggle: toggleWishlist, isWishlisted } = useWishlistStore()

  const displayPrice = selectedVariant?.price
    ? parseFloat(selectedVariant.price)
    : product
      ? (product.is_promo ? parseFloat(product.promo_price) : parseFloat(product.price))
      : 0

  // B2B min qty enforcement
  useEffect(() => {
    if (product && isB2B && product.b2b_min_stock > 1) {
      setQuantity((q) => Math.max(q, product.b2b_min_stock))
    }
  }, [product, isB2B])

  // Pixel tracking
  useEffect(() => {
    if (!product) return
    if (window.fbq) window.fbq('track', 'ViewContent', { content_name: product.name, content_ids: [product.id], content_type: 'product', value: displayPrice, currency: 'DZD' })
    if (window.ttq) window.ttq.track('ViewContent', { content_name: product.name, content_id: product.id, content_type: 'product', value: displayPrice, currency: 'DZD' })
  }, [product, displayPrice])

  // Fetch product
  useEffect(() => {
    if (!product) setLoading(true)
    getProduct(slug)
      .then((r) => {
        setProduct(r.data)
        if (r.data.variants?.length > 0) setSelectedVariant(r.data.variants[0])
      })
      .catch(() => { if (!product) setError('Produit introuvable.') })
      .finally(() => setLoading(false))

    getRelatedProducts(slug)
      .then((r) => setRelatedProducts(r))
      .catch(() => {})
  }, [slug])

  // Auto-slideshow
  const images = product?.images?.length > 0
    ? product.images
    : product?.thumbnail ? [{ image: product.thumbnail, alt: product.name }] : []

  useEffect(() => {
    if (images.length > 1) {
      const timer = setInterval(() => {
        setSelectedImage((prev) => prev === -1 ? 0 : prev < images.length - 1 ? prev + 1 : 0)
      }, 4000)
      return () => clearInterval(timer)
    }
  }, [images.length])

  const handleAddToCart = useCallback(() => {
    addItem(product, selectedVariant, quantity, isB2B ? packaging : 'boite')
    selectedRelated.forEach((rpId) => {
      const rp = product.related_products?.find((p) => p.id === rpId)
      if (rp) addItem(rp, null, 1)
    })
    if (window.fbq) window.fbq('track', 'AddToCart', { content_name: product.name, content_ids: [product.id], content_type: 'product', value: displayPrice * quantity, currency: 'DZD' })
    if (window.ttq) window.ttq.track('AddToCart', { content_name: product.name, content_id: product.id, content_type: 'product', value: displayPrice * quantity, currency: 'DZD', quantity })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    setSelectedRelated([])
  }, [product, selectedVariant, quantity, packaging, isB2B, selectedRelated, displayPrice, addItem])

  const handleVariantSelect = useCallback((v) => {
    setSelectedVariant(v)
    if (v.image) setSelectedImage(-1)
  }, [])

  const handleRelatedChange = useCallback((id, checked) => {
    setSelectedRelated((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))
  }, [])

  // ── Skeleton
  if (loading) return (
    <div className="product-page product-page--loading">
      <div className="container">
        <div className="product-page__layout">
          <div className="skeleton skeleton-img--tall product-skeleton__img" />
          <div className="product-skeleton__info">
            <div className="skeleton skeleton-badge" />
            <div className="skeleton product-skeleton__title" />
            <div className="skeleton product-skeleton__price" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text skeleton-text--short" />
            <div className="skeleton product-skeleton__btn" />
          </div>
        </div>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="product-page-error container">
      <p>{error || 'Produit non trouvé.'}</p>
      <Link to="/shop" className="btn btn-accent">Retour à la boutique</Link>
    </div>
  )

  return (
    <main className="product-page page-enter">
      <PageSEO
        title={product.name}
        description={product.short_description || product.description?.slice(0, 155) || `Achetez ${product.name} chez Piové Cosmetics — livraison dans toute l'Algérie.`}
        image={product.thumbnail}
        url={`/produit/${product.slug}`}
        type="product"
      />
      <div className="container">
        {/* Breadcrumb */}
        <nav className="product-page__breadcrumb" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link> /
          <Link to="/shop">Produits</Link> /
          {product.categories?.length > 0 && (
            <Link to={`/category/${product.categories[0].slug}`}>{product.categories[0].name}</Link>
          )}
          / <span aria-current="page">{product.name}</span>
        </nav>

        {/* Main layout: gallery + info */}
        <div className="product-page__layout">
          <ProductGallery
            product={product}
            images={images}
            selectedImage={selectedImage}
            selectedVariant={selectedVariant}
            onSelectImage={setSelectedImage}
          />
          <ProductInfo
            product={product}
            selectedVariant={selectedVariant}
            quantity={quantity}
            packaging={packaging}
            added={added}
            selectedRelated={selectedRelated}
            isB2B={isB2B}
            isWishlisted={isWishlisted(product.id)}
            onVariantSelect={handleVariantSelect}
            onQuantityChange={setQuantity}
            onPackagingChange={setPackaging}
            onAddToCart={handleAddToCart}
            onToggleWishlist={() => toggleWishlist(product)}
            onRelatedChange={handleRelatedChange}
          />
        </div>

        {/* Reviews */}
        <ProductReviews reviews={product.reviews} />

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="product-related">
            <h2 className="product-section-title">Vous aimerez aussi</h2>
            <div className="related-products-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
