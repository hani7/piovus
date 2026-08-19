import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

const CACHE_KEY = 'piove_top_banner'

const getDismissKey = (b) => `piove_banner_dismissed_${b.id}_${b.updated_at || ''}`

export default function PromoBanner() {
  const [banner, setBanner] = useState(() => {
    // Lire le cache immédiatement (évite le flash de disparition entre navigations)
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [dismissed, setDismissed] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const b = JSON.parse(cached)
        return localStorage.getItem(getDismissKey(b)) === 'true'
      }
    } catch {}
    return false
  })

  // Recalculer 'dismissed' quand le banner vient de l'API avec une date différente
  useEffect(() => {
    if (banner) {
      setDismissed(localStorage.getItem(getDismissKey(banner)) === 'true')
    }
  }, [banner])

  useEffect(() => {
    client.get('/banners/?placement=top_banner')
      .then((res) => {
        const results = res.data.results || res.data
        if (results && results.length > 0) {
          const b = results[0]
          setBanner(b)
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch {}
        } else {
          // Aucun banner actif → vider le cache
          setBanner(null)
          try { localStorage.removeItem(CACHE_KEY) } catch {}
        }
      })
      .catch(() => {
        // Erreur réseau : on garde le banner en cache s'il existe
      })
  }, [])

  if (!banner || dismissed) return null

  return (
    <div
      className="global-promo-banner"
      style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 40px 10px 15px',
        fontSize: '0.9rem',
        position: 'relative',
        zIndex: 1000,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <strong>{banner.title}</strong>
      {banner.subtitle && <span>- {banner.subtitle}</span>}
      {banner.cta_label && banner.cta_url && (
        <Link to={banner.cta_url} style={{ color: 'var(--color-accent, #c6a87c)', fontWeight: 'bold', textDecoration: 'underline' }}>
          {banner.cta_label}
        </Link>
      )}
      {/* Bouton fermeture */}
      <button
        onClick={() => {
          setDismissed(true)
          if (banner) {
            localStorage.setItem(getDismissKey(banner), 'true')
          }
        }}
        aria-label="Fermer le bandeau"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#aaa',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  )
}

