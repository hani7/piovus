import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFeaturedProducts, getNewArrivals, getCategories, getBanners, getPromotions } from '../api/products'
import mediaUrl from '../api/mediaUrl'
import ProductCarousel from '../components/ProductCarousel'
import ProductCard from '../components/ProductCard'
import CategoryCarouselSection from '../components/CategoryCarouselSection'
import CuratedSection from '../components/CuratedSection'
import './HomePage.css'

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [heroBanners, setHeroBanners] = useState([])
  const [horizontalBanner, setHorizontalBanner] = useState(null)
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCategories(),
      getBanners()
    ])
      .then(([cats, bans]) => {
        setCategories(cats.data.results || cats.data)
        
        const allBanners = bans.data.results || bans.data
        const heroes = allBanners.filter(b => b.placement === 'hero' && b.is_active !== false)
        const horiz = allBanners.find(b => b.placement === 'horizontal_new_banner' && b.is_active !== false)
        setHeroBanners(heroes)
        setHorizontalBanner(horiz)
      })
      .finally(() => setLoading(false))
  }, [])


  const nextSlide = useCallback(() => {
    if (heroBanners.length > 0) {
      setSlide((s) => (s + 1) % heroBanners.length)
    }
  }, [heroBanners])

  useEffect(() => {
    if (heroBanners.length > 1) {
      const t = setInterval(nextSlide, 5000)
      return () => clearInterval(t)
    }
  }, [nextSlide, heroBanners.length])

  // Removing hardcoded subLabels and orderedSlugs

  return (
    <main className="homepage page-enter">
      {/* Hero Slider */}
      {loading ? (
        <section className="hero hero-skeleton" aria-hidden="true"></section>
      ) : heroBanners.length > 0 ? (
        <section 
          className="hero"
          aria-label="Bannière principale"
        >
          {heroBanners[slide].image ? (
            heroBanners[slide].image.match(/\.(mp4|webm|mov)$/i) ? (
              <video
                key={`video-${slide}`}
                src={mediaUrl(heroBanners[slide].image)}
                className="hero__bg-img"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <img
                key={`img-${slide}`}
                src={mediaUrl(heroBanners[slide].image)}
                alt={heroBanners[slide].title || 'Bannière'}
                className="hero__bg-img"
                loading="eager"
                fetchPriority="high"
              />
            )
          ) : (
            <div className="hero__bg-img hero__bg-placeholder" />
          )}

          <div className="hero__content-wrapper">
            
            {heroBanners.length > 1 && (
              <div className="hero__pagination">
                {heroBanners.map((_, i) => (
                  <div 
                    key={i} 
                    className={`hero__pag-dot ${i === slide ? 'active' : ''}`} 
                    onClick={() => setSlide(i)}
                  >
                    0{i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="hero" aria-label="Bannière principale">
          <div className="hero__bg-img hero__bg-placeholder" />
          <div className="hero__content-wrapper">
          </div>
        </section>
      )}

      {/* Collections Section */}
      <section className="collections-section">
        <div className="collections-header">
           <p className="collections-eyebrow">Nos collections</p>
           <h2 className="collections-title">EXPLORER NOS CATÉGORIES</h2>
        </div>
        <div className="collections-grid">
          {(categories || []).filter(c => c.slug !== 'offres-speciales').slice(0, 5).map((cat) => (
               <Link key={cat.slug} to={`/${cat.slug}`} className="collection-card">
                  <div className="collection-img-wrap">
                    {cat.image ? (
                      <img src={mediaUrl(cat.image)} alt={cat.name} />
                    ) : (
                      <div className="collection-placeholder">
                         <span>{cat.name.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="collection-info">
                     <h3>{cat.name.toUpperCase()}</h3>
                     <span className="collection-arrow">&rarr;</span>
                  </div>
               </Link>
          ))}
        </div>
      </section>

      {/* Curated Products Section (replaces philosophy) */}
      <CuratedSection />

      {/* Horizontal Banner Section */}
      {horizontalBanner && (
        <section className="horizontal-banner" style={{position: 'relative', width: '100%', minHeight: '350px', background: '#000', overflow: 'hidden'}}>
          {horizontalBanner.image && (
            <img src={mediaUrl(horizontalBanner.image)} alt={horizontalBanner.title} style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0}} />
          )}
          <div style={{position: 'relative', zIndex: 2, height: '100%', minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 10%'}}>
            <div style={{maxWidth: '450px', color: '#fff'}}>
              {horizontalBanner.subtitle && <p style={{fontSize: '0.8rem', letterSpacing: '0.2em', marginBottom: '10px', textTransform: 'uppercase'}}>{horizontalBanner.subtitle}</p>}
              {horizontalBanner.title && <h2 style={{fontFamily: '"Times New Roman", Times, serif', fontSize: '3.5rem', marginBottom: '20px', lineHeight: '1.1'}}>{horizontalBanner.title}</h2>}
              {horizontalBanner.cta_label && (
                <Link to={horizontalBanner.cta_url || '/shop'} style={{display: 'inline-block', background: '#fff', color: '#000', padding: '12px 24px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '10px'}}>{horizontalBanner.cta_label} &rarr;</Link>
              )}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}
