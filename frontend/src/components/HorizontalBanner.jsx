import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBanners } from '../api/products'
import mediaUrl from '../api/mediaUrl'

export default function HorizontalBanner() {
  const [horizontalBanner, setHorizontalBanner] = useState(null)

  useEffect(() => {
    getBanners().then(bans => {
      const allBanners = bans.data.results || bans.data
      const horiz = allBanners.find(b => b.placement === 'horizontal_new_banner' && b.is_active !== false)
      setHorizontalBanner(horiz)
    }).catch(console.error)
  }, [])

  if (!horizontalBanner) return null

  return (
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
  )
}
