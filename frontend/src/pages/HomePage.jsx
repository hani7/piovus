import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { getFeaturedProducts, getNewArrivals, getCategories } from '../api/products'
import './HomePage.css'

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Sublimez Votre Beauté',
    subtitle: 'Nouvelle Collection Printemps 2026',
    desc: 'Découvrez nos formules experts pensées pour sublimer chaque teint',
    cta: 'Découvrir',
    ctaUrl: '/shop',
    color: 'from-rose to-cream',
  },
  {
    id: 2,
    title: 'Offres Spéciales',
    subtitle: 'Jusqu\'à -30% sur une sélection',
    desc: 'Profitez de nos promotions sur les meilleures marques de cosmétiques',
    cta: 'Voir les offres',
    ctaUrl: '/shop',
    color: 'from-dark to-accent',
  },
  {
    id: 3,
    title: 'Soins Premium',
    subtitle: 'Skin Care & Body',
    desc: 'Des soins formulés pour nourrir, protéger et illuminer votre peau',
    cta: 'Explorer',
    ctaUrl: '/category/skin-care-body',
    color: 'from-gold to-cream',
  },
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [categories, setCategories] = useState([])
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFeaturedProducts(), getNewArrivals(), getCategories()])
      .then(([feat, newArr, cats]) => {
        setFeatured(feat.data.results || feat.data)
        setNewArrivals(newArr.data.results || newArr.data)
        setCategories(cats.data.results || cats.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const nextSlide = useCallback(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), [])
  const prevSlide = useCallback(() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length), [])

  useEffect(() => {
    const t = setInterval(nextSlide, 5000)
    return () => clearInterval(t)
  }, [nextSlide])

  const current = HERO_SLIDES[slide]

  return (
    <main className="homepage page-enter">
      {/* ── Hero Slider ─────────────────────────────────── */}
      <section className={`hero hero--${current.id}`} aria-label="Bannière principale">
        <div className="hero__content container">
          <div className="hero__text">
            <p className="hero__eyebrow">{current.subtitle}</p>
            <h1 className="hero__title">{current.title}</h1>
            <p className="hero__desc">{current.desc}</p>
            <div className="hero__ctas">
              <Link to={current.ctaUrl} className="btn btn-accent hero__cta" id={`hero-cta-${current.id}`}>
                {current.cta}
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link to="/shop" className="btn btn-outline hero__cta-ghost" id="hero-shop-all">
                Toute la boutique
              </Link>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__circle">
              <div className="hero__circle-inner" />
            </div>
          </div>
        </div>

        {/* Controls */}
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
        <div className="hero__dots">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero__dot ${i === slide ? 'hero__dot--active' : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              id={`hero-dot-${i}`}
            />
          ))}
        </div>
      </section>

      {/* ── USP Bar ──────────────────────────────────────── */}
      <div className="usp-bar">
        <div className="container usp-bar__inner">
          {[
            { icon: '🚚', label: 'Livraison Gratuite', sub: 'À partir de 5000 DA' },
            { icon: '💳', label: 'Paiement à la livraison', sub: 'Cash on delivery' },
            { icon: '✨', label: 'Produits Authentiques', sub: '100% originaux' },
            { icon: '↩️', label: 'Retour Facile', sub: '7 jours pour changer' },
          ].map((u, i) => (
            <div key={i} className="usp-item">
              <span className="usp-item__icon">{u.icon}</span>
              <div>
                <p className="usp-item__label">{u.label}</p>
                <p className="usp-item__sub">{u.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Categories ───────────────────────────────────── */}
      <section className="section" id="categories-section">
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

      {/* ── Featured Products ────────────────────────────── */}
      <section className="section section--cream" id="featured-section">
        <div className="container">
          <p className="section-subtitle">Sélection</p>
          <h2 className="section-title">Nos Best Sellers</h2>
          <div className="section-line" />
          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="products-grid">
              {(featured || []).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/shop" className="btn btn-outline" id="see-all-featured">Voir tous les produits</Link>
          </div>
        </div>
      </section>

      {/* ── Promo Banner ─────────────────────────────────── */}
      <section className="promo-banner">
        <div className="container promo-banner__inner">
          <div className="promo-banner__text">
            <p className="promo-banner__eyebrow">Offre Exclusive</p>
            <h2 className="promo-banner__title">Nouvelle Arrivée — Up to 30% OFF</h2>
            <p className="promo-banner__desc">
              Découvrez notre nouvelle collection et profitez de remises exceptionnelles
              sur une sélection de produits de beauté premium.
            </p>
            <Link to="/shop" className="btn btn-accent" id="promo-cta">Profiter de l'offre</Link>
          </div>
          <div className="promo-banner__deco">
            <div className="promo-banner__circle promo-banner__circle--1" />
            <div className="promo-banner__circle promo-banner__circle--2" />
          </div>
        </div>
      </section>

      {/* ── New Arrivals ─────────────────────────────────── */}
      <section className="section" id="new-arrivals-section">
        <div className="container">
          <p className="section-subtitle">Tendances</p>
          <h2 className="section-title">Nouvelles Arrivées</h2>
          <div className="section-line" />
          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="products-grid">
              {(newArrivals || []).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/shop?new=true" className="btn btn-primary" id="see-new-arrivals">Voir les nouveautés</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
