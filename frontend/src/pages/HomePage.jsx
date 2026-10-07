import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFeaturedProducts, getNewArrivals, getCategories, getBanners, getPromotions } from '../api/products'
import mediaUrl from '../api/mediaUrl'
import ProductCarousel from '../components/ProductCarousel'
import ProductCard from '../components/ProductCard'
import CategoryCarouselSection from '../components/CategoryCarouselSection'
import './HomePage.css'

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [heroBanners, setHeroBanners] = useState([])
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
        setHeroBanners(heroes)
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
            <div className="hero__text">
              <p className="hero__eyebrow">PIOVÉ COSMETICS</p>
              <h1 className="hero__title">{heroBanners[slide].title || 'MAKE YOUR STATEMENT.'}</h1>
              <p className="hero__desc">{heroBanners[slide].subtitle || 'Bold colors. Flawless finishes. Makeup that empowers you.'}</p>
              <Link to={heroBanners[slide].cta_url || '/shop'} className="hero__btn">
                {heroBanners[slide].cta_label || 'SHOP ALL'} &rarr;
              </Link>
            </div>
            
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
            <div className="hero__text">
              <p className="hero__eyebrow">PIOVÉ COSMETICS</p>
              <h1 className="hero__title">MAKE YOUR<br/>STATEMENT.</h1>
              <p className="hero__desc">Bold colors. Flawless finishes.<br/>Makeup that empowers you.</p>
              <Link to="/shop" className="hero__btn">SHOP ALL &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Collections Section */}
      <section className="collections-section">
        <div className="collections-header">
           <p className="collections-eyebrow">EXPLORE OUR COLLECTIONS</p>
           <h2 className="collections-title">BEAUTY IN EVERY DETAIL</h2>
        </div>
        <div className="collections-grid">
          {(categories || []).filter(c => c.slug !== 'offres-speciales').slice(0, 6).map((cat) => (
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
                     <p>EXPLORE COLLECTION</p>
                     <span className="collection-arrow">&rarr;</span>
                  </div>
               </Link>
          ))}
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="philosophy-section">
         <div className="philosophy-left">
            <div className="philosophy-image-large"></div>
         </div>
         <div className="philosophy-right">
            <div className="philosophy-text-content">
              <p className="philosophy-eyebrow">THE PIOVÉ PHILOSOPHY</p>
              <h2 className="philosophy-title">YOUR FACE.<br/>YOUR RULES.</h2>
              <p className="philosophy-desc">
                Whether you're going for a natural glow<br/>or a bold statement, Piové gives you the tools<br/>to express every side of you.
              </p>
              <Link to="/shop" className="philosophy-btn">EXPLORE THE COLLECTION &rarr;</Link>
            </div>
            <div className="philosophy-image-small-wrap">
              <div className="philosophy-image-small"></div>
            </div>
         </div>
      </section>

    </main>
  )
}
