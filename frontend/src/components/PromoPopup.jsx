import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { X } from 'lucide-react'
import './PromoPopup.css'

export default function PromoPopup() {
  const [banner, setBanner] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user already saw a popup recently
    const hasSeen = sessionStorage.getItem('piove_popup_seen')
    if (hasSeen) return

    client.get('/banners/?placement=popup')
      .then((res) => {
        const results = res.data.results || res.data
        if (results && results.length > 0) {
          setBanner(results[0])
          // Add small delay for better UX
          setTimeout(() => setIsVisible(true), 1500)
        }
      })
      .catch((err) => console.error('Failed to load popup banner:', err))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isVisible) {
        closePopup()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  const closePopup = () => {
    setIsVisible(false)
    sessionStorage.setItem('piove_popup_seen', 'true')
  }

  if (!banner || !isVisible) return null

  return (
    <div className="promo-popup-overlay" onClick={closePopup}>
      <div className="promo-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="promo-popup-close" onClick={closePopup} aria-label="Fermer">
          <X size={20} color="#000" />
        </button>
        {banner.image && (
          <div className="promo-popup-image">
            <img src={banner.image} alt={banner.title} />
          </div>
        )}
        <div className="promo-popup-text">
          {banner.subtitle && <p className="promo-popup-eyebrow">{banner.subtitle}</p>}
          <h2 className="promo-popup-title">{banner.title}</h2>
          {banner.promo_code && (
            <div className="promo-popup-code">
              Code: <strong>{banner.promo_code}</strong>
            </div>
          )}
          {banner.cta_label && banner.cta_url && (
            <Link to={banner.cta_url} className="btn btn-accent promo-popup-cta" onClick={closePopup}>
              {banner.cta_label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
