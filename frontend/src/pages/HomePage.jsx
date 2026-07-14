import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFeaturedProducts, getNewArrivals, getCategories, getBanners, getPromotions } from '../api/products'
import ProductCarousel from '../components/ProductCarousel'
import ProductCard from '../components/ProductCard'
import CategoryCarouselSection from '../components/CategoryCarouselSection'
import './HomePage.css'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [promotions, setPromotions] = useState([])
  const [categories, setCategories] = useState([])
  const [heroBanners, setHeroBanners] = useState([])
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getFeaturedProducts(),
      getNewArrivals(),
      getPromotions(),
      getCategories(),
      getBanners()
    ])
      .then(([feat, newArr, promos, cats, bans]) => {
        setFeatured(feat.data.results || feat.data)
        setNewArrivals(newArr.data.results || newArr.data)
        setPromotions(promos.data.results || promos.data)
        setCategories(cats.data.results || cats.data)
        
        const allBanners = bans.data.results || bans.data
        const heroes = allBanners.filter(b => b.placement === 'hero' && b.is_active !== false)
        setHeroBanners(heroes)
      })
      .finally(() => setLoading(false))
  }, [])


  const nextSlide = useCallback(() => {
    if (heroBanners.length > 0) {
      setSlide((s) => (s + 1) % heroBanners.length)
    }
  }, [heroBanners])
  
  const prevSlide = useCallback(() => {
    if (heroBanners.length > 0) {
      setSlide((s) => (s - 1 + heroBanners.length) % heroBanners.length)
    }
  }, [heroBanners])

  useEffect(() => {
    if (heroBanners.length > 1) {
      const t = setInterval(nextSlide, 5000)
      return () => clearInterval(t)
    }
  }, [nextSlide, heroBanners.length])

  return (
    <main className="homepage page-enter">
      {/* ── Hero Slider ─────────────────────────────────── */}
      {heroBanners.length > 0 && (
        <section 
          className="hero" 
          aria-label="Bannière principale"
          style={{ 
            backgroundImage: `url(${heroBanners[slide].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
        <div className="hero__content container">
          <div className="hero__text">
            <p className="hero__eyebrow">{heroBanners[slide].subtitle}</p>
            <h1 className="hero__title">{heroBanners[slide].title}</h1>
          </div>
        </div>

        {/* Button above dots */}
        <div className="hero__bottom">
          {(heroBanners[slide].cta_label || heroBanners[slide].cta_url) && (
            <Link to={heroBanners[slide].cta_url || '/shop'} className="btn btn-accent hero__cta">
              {heroBanners[slide].cta_label || 'Découvrir'}
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: '8px' }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          )}

          {heroBanners.length > 1 && (
            <div className="hero__dots">
              {heroBanners.map((_, i) => (
                <button
                  key={i}
                  className={`hero__dot ${i === slide ? 'hero__dot--active' : ''}`}
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  id={`hero-dot-${i}`}
                />
              ))}
            </div>
          )}
        </div>

        {heroBanners.length > 1 && (
          <>
            <button className="hero__prev" onClick={prevSlide} aria-label="Précédent" id="hero-prev">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="hero__next" onClick={nextSlide} aria-label="Suivant" id="hero-next">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </>
        )}
      </section>
      )}


      {/* ── Best Sellers Block ───────────────────────────── */}
      <ProductCarousel title="Nos Best Sellers" products={featured} isLoading={loading} />

      {/* ── Nouveautés ────────────────────────────────── */}
      <ProductCarousel title="Nouveautés" products={newArrivals} isLoading={loading} className="promo-carousel-theme" />

      {/* ── Categories ───────────────────────────────────── */}
      <section className="section" id="categories-section" style={{ paddingTop: '20px' }}>
        <div className="container">
          <p className="section-subtitle">Nos Collections</p>
          <h2 className="section-title">Explorez par Catégorie</h2>
          <div className="section-line" />
          <div className="categories-grid">
            {(categories || []).map((cat) => (
              <Link key={cat.slug} to={`/category/${cat.slug}`} className="cat-card" id={`cat-${cat.slug}`}>
                <div className="cat-card__img">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} />
                  ) : (
                    <div className="cat-card__placeholder" />
                  )}
                </div>
                <div className="cat-card__overlay">
                  <p className="cat-card__name">{cat.name}</p>
                  <p className="cat-card__count">{cat.product_count} produits</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offres Spéciales ───────────────────────────────────── */}
      <ProductCarousel title="Offres Spéciales" products={promotions} isLoading={loading} className="promo-carousel-theme" />


      {/* ── Category Carousels ───────────────────────────── */}
      {(categories || [])
        .filter(cat => cat.slug !== 'offres-speciales')
        .map(cat => (
          <CategoryCarouselSection key={cat.slug} category={cat} />
      ))}




    </main>
  )
}
