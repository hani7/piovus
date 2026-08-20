import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import client from '../api/client'
import mediaUrl from '../api/mediaUrl'
import './SideBanners.css'

export default function SideBanners() {
  const [leftBanners, setLeftBanners] = useState([])
  const [rightBanners, setRightBanners] = useState([])
  const [hiddenBanners, setHiddenBanners] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Charger les bannières masquées depuis le localStorage
    const savedHidden = JSON.parse(localStorage.getItem('piove_hidden_side_banners') || '[]')
    setHiddenBanners(savedHidden)

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

  const getDismissKey = (banner) => `${banner.id}_${banner.updated_at || ''}`

  const handleClose = (e, banner) => {
    e.preventDefault()
    e.stopPropagation()
    const key = getDismissKey(banner)
    
    setHiddenBanners(prev => {
      if (prev.includes(key)) return prev
      const newHidden = [...prev, key]
      localStorage.setItem('piove_hidden_side_banners', JSON.stringify(newHidden))
      return newHidden
    })
  }

  const renderMedia = (banner) => {
    if (banner.image && banner.image.match(/\.(mp4|webm|mov)$/i)) {
      return (
        <video
          src={mediaUrl(banner.image)}
          autoPlay
          loop
          muted
          playsInline
        />
      )
    }
    return <img src={mediaUrl(banner.image)} alt={banner.title || ''} />
  }

  if (leftBanners.length === 0 && rightBanners.length === 0) return null

  return (
    <>
      {leftBanners.filter(b => !hiddenBanners.includes(getDismissKey(b))).map((banner, index) => {
        const isVideo = banner.image && banner.image.match(/\.(mp4|webm|mov)$/i)
        const typeClass = isVideo ? 'side-banner--video' : 'side-banner--image'
        return (
          <div
            key={`left-${banner.id}-${index}`}
            className={`side-banner side-banner--left ${typeClass}${visible ? ' side-banner--visible' : ''}`}
            style={{ bottom: `${20 + index * 210}px` }}
          >
            <button className="side-banner__close" onClick={(e) => handleClose(e, banner)} onTouchStart={(e) => handleClose(e, banner)}>
              <X size={12} />
            </button>
            <a href={banner.cta_url || '#'} style={{ display: 'block', width: '100%', height: '100%' }}>
              {renderMedia(banner)}
            </a>
          </div>
        )
      })}

      {rightBanners.filter(b => !hiddenBanners.includes(getDismissKey(b))).map((banner, index) => {
        const isVideo = banner.image && banner.image.match(/\.(mp4|webm|mov)$/i)
        const typeClass = isVideo ? 'side-banner--video' : 'side-banner--image'
        return (
          <div
            key={`right-${banner.id}-${index}`}
            className={`side-banner side-banner--right ${typeClass}${visible ? ' side-banner--visible' : ''}`}
            style={{ bottom: `${20 + index * 210}px` }}
          >
            <button className="side-banner__close" onClick={(e) => handleClose(e, banner)} onTouchStart={(e) => handleClose(e, banner)}>
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
