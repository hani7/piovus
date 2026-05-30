import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function PromoBanner() {
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    client.get('/banners/?placement=top_banner')
      .then((res) => {
        const results = res.data.results || res.data
        if (results && results.length > 0) {
          setBanner(results[0])
        }
      })
      .catch((err) => console.error('Failed to load top banner:', err))
  }, [])

  if (!banner) return null

  return (
    <div className="global-promo-banner" style={{ backgroundColor: '#1a1a1a', color: '#fff', textAlign: 'center', padding: '10px 15px', fontSize: '0.9rem', position: 'relative', zIndex: 1000, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
      <strong>{banner.title}</strong>
      {banner.subtitle && <span>- {banner.subtitle}</span>}
      {banner.cta_label && banner.cta_url && (
        <Link to={banner.cta_url} style={{ color: 'var(--color-accent, #c6a87c)', fontWeight: 'bold', textDecoration: 'underline' }}>
          {banner.cta_label}
        </Link>
      )}
    </div>
  )
}
