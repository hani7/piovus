import { useRef, useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import './ProductCarousel.css'

export default function ProductCarousel({ title, products, isLoading, className = "" }) {
  const scrollRef = useRef(null)
  const [activeDot, setActiveDot] = useState(0)
  const [dotsCount, setDotsCount] = useState(1)

  useEffect(() => {
    if (!products) return
    const updateDots = () => {
      if (scrollRef.current) {
        const { clientWidth, scrollWidth } = scrollRef.current
        const count = Math.ceil(scrollWidth / clientWidth)
        setDotsCount(Math.max(1, count))
      }
    }
    // Update slightly after mount to ensure DOM is ready
    const timeoutId = setTimeout(updateDots, 100)
    window.addEventListener('resize', updateDots)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDots)
    }
  }, [products])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const currentDot = Math.round(scrollLeft / clientWidth)
      setActiveDot(currentDot)
    }
  }

  const scrollToDot = (index) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      scrollRef.current.scrollTo({ left: clientWidth * index, behavior: 'smooth' })
    }
  }

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      const scrollAmount = direction === 'left' ? -clientWidth : clientWidth
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <section className={`product-carousel-section ${className}`}>
        {title && (
          <div className="carousel-header">
            <h2 className="carousel-title">{title.toUpperCase()}</h2>
          </div>
        )}
        <div className="container">
          <div className="spinner" style={{ margin: '40px auto' }} />
        </div>
      </section>
    )
  }

  if (!products || products.length === 0) return null

  return (
    <section className={`product-carousel-section ${className}`}>
      {title && (
        <div className="carousel-header">
          <h2 className="carousel-title">{title.toUpperCase()}</h2>
        </div>
      )}
      <div className="carousel-outer">
        {/* Arrow LEFT — outside cards */}
        <button className="product-carousel-btn left" onClick={() => scroll('left')} aria-label="Défiler à gauche">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Cards track */}
        <div className="carousel-track-wrapper container">
          <div className="carousel-track" ref={scrollRef} onScroll={handleScroll}>
            {products.map(p => (
              <div className="carousel-item" key={p.id}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrow RIGHT — outside cards */}
        <button className="product-carousel-btn right" onClick={() => scroll('right')} aria-label="Défiler à droite">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {dotsCount > 1 && (
        <div className="carousel-dots">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === activeDot ? 'active' : ''}`}
              onClick={() => scrollToDot(i)}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
