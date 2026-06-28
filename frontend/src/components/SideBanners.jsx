import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import client from '../api/client'
import './SideBanners.css'

export default function SideBanners() {
  const [leftBanners, setLeftBanners] = useState([])
  const [rightBanners, setRightBanners] = useState([])
  const [hiddenBanners, setHiddenBanners] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    client.get('/banners/')
      .then((res) => {
        const results = res.data.results || res.data
        if (results && results.length > 0) {
          const left = results.filter(b => b.placement === 'side_left' && b.is_active !== false)
          const right = results.filter(b => b.placement === 'side_right' && b.is_active !== false)
          setLeftBanners(left)
          setRightBanners(right)
        }
      })
      .catch((err) => console.error('Failed to load side banners:', err))

    // Slide in after 5 seconds
    const timer = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setHiddenBanners(prev => [...prev, id])
  }

  const renderMedia = (banner) => {
    if (banner.video) {
      return (
        <video
          src={banner.video}
          autoPlay
          loop
          muted
          playsInline
        />
      )
    }
    return <img src={banner.image} alt={banner.title || ''} />
  }

  if (leftBanners.length === 0 && rightBanners.length === 0) return null

  return (
    <>
      {leftBanners.filter(b => !hiddenBanners.includes(b.id)).map((banner, index) => {
        const typeClass = banner.video ? 'side-banner--video' : 'side-banner--image'
        return (
          <div
            key={`left-${banner.id}-${index}`}
            className={`side-banner side-banner--left ${typeClass}${visible ? ' side-banner--visible' : ''}`}
            style={{ bottom: `${20 + index * 210}px` }}
          >
            <button className="side-banner__close" onClick={(e) => handleClose(e, banner.id)}>
              <X size={12} />
            </button>
            <a href={banner.cta_url || '#'} style={{ display: 'block', width: '100%', height: '100%' }}>
              {renderMedia(banner)}
            </a>
          </div>
        )
      })}

      {rightBanners.filter(b => !hiddenBanners.includes(b.id)).map((banner, index) => {
        const typeClass = banner.video ? 'side-banner--video' : 'side-banner--image'
        return (
          <div
            key={`right-${banner.id}-${index}`}
            className={`side-banner side-banner--right ${typeClass}${visible ? ' side-banner--visible' : ''}`}
            style={{ bottom: `${20 + index * 210}px` }}
          >
            <button className="side-banner__close" onClick={(e) => handleClose(e, banner.id)}>
              <X size={12} />
            </button>
            <a href={banner.cta_url || '#'} style={{ display: 'block', width: '100%', height: '100%' }}>
              {renderMedia(banner)}
            </a>
          </div>
        )
      })}
    </>
  )
}
