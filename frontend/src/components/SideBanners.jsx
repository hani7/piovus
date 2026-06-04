import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import client from '../api/client'
import './SideBanners.css'

export default function SideBanners() {
  const [leftBanners, setLeftBanners] = useState([])
  const [rightBanners, setRightBanners] = useState([])
  const [hiddenBanners, setHiddenBanners] = useState([])

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
  }, [])

  const handleClose = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setHiddenBanners(prev => [...prev, id])
  }

  if (leftBanners.length === 0 && rightBanners.length === 0) return null

  return (
    <>
      {leftBanners.filter(b => !hiddenBanners.includes(b.id)).map((banner, index) => (
        <div 
          key={`left-${banner.id}-${index}`} 
          className="side-banner side-banner--left"
          style={{ bottom: `${20 + index * 130}px` }}
        >
          <button className="side-banner__close" onClick={(e) => handleClose(e, banner.id)}>
            <X size={14} />
          </button>
          <a href={banner.cta_url || '#'} style={{ display: 'block' }}>
            <img src={banner.image} alt={banner.title || 'Bannière gauche'} />
          </a>
        </div>
      ))}
      
      {rightBanners.filter(b => !hiddenBanners.includes(b.id)).map((banner, index) => (
        <div 
          key={`right-${banner.id}-${index}`} 
          className="side-banner side-banner--right"
          style={{ bottom: `${20 + index * 130}px` }}
        >
          <button className="side-banner__close" onClick={(e) => handleClose(e, banner.id)}>
            <X size={14} />
          </button>
          <a href={banner.cta_url || '#'} style={{ display: 'block' }}>
            <img src={banner.image} alt={banner.title || 'Bannière droite'} />
          </a>
        </div>
      ))}
    </>
  )
}
