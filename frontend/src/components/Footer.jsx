import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCategories } from '../api/products'
import apiClient from '../api/client'
import './Footer.css'

export default function Footer() {
  const [categories, setCategories] = useState([])
  const [nlEmail, setNlEmail] = useState('')
  const [nlStatus, setNlStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [nlMsg, setNlMsg] = useState('')

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.results || r.data)).catch(() => {})
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!nlEmail) return
    setNlStatus('loading')
    try {
      const res = await apiClient.post('/newsletter/subscribe/', { email: nlEmail })
      setNlMsg(res.data.message)
      setNlStatus('success')
      setNlEmail('')
    } catch (err) {
      setNlMsg(err.response?.data?.error || 'Une erreur est survenue. Reessayez.')
      setNlStatus('error')
    }
  }

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__top">
          <div className="footer__brand-col">
            <Link to="/" className="footer__logo">
              <img src="/logo.png" alt="Piové Cosmetics" className="footer__logo-img" />
            </Link>
            <p className="footer__tagline">BE BOLD. BE PIOVE.</p>
            <div className="footer__socials">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" aria-label="TikTok">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.34 2.88 2.88 0 0 1 2.31-4.53 2.66 2.66 0 0 1 1.61.53V9.5a6.33 6.33 0 0 0-1.61-.22 6.32 6.32 0 0 0-5.06 10 6.32 6.32 0 0 0 11.38-2.93V8.55a8.27 8.27 0 0 0 3.79 1.83z"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          <div className="footer__links-col">
            <h4>NOS CATEGORIES</h4>
            <Link to="/shop">Tous les Produits</Link>
            {(categories || []).filter(c => c.slug !== 'offres-speciales').slice(0, 5).map(c => (
              <Link key={c.slug} to={`/${c.slug}`}>{c.name}</Link>
            ))}
          </div>

          <div className="footer__links-col">
            <h4>INFORMATIONS</h4>
            <Link to="/about">A Propos</Link>
            <Link to="/contact">Contactez-nous</Link>
            <Link to="/faq">FAQ</Link>
          </div>

          <div className="footer__links-col">
            <h4>SERVICE CLIENT</h4>
            <Link to="/compte">Mon Compte</Link>
            <Link to="/suivi">Suivre ma Commande</Link>
            <Link to="/livraison">Livraison &amp; Retour</Link>
            <Link to="/confidentialite">Politique de Confidentialite</Link>
            <Link to="/conditions">Conditions d'Utilisation</Link>
          </div>

          <div className="footer__newsletter-col">
            <h4>RESTEZ DANS L'UNIVERS PIOVE</h4>
            <p>Rejoignez notre newsletter pour des mises a jour exclusives, de nouveaux lancements et des conseils beaute.</p>
            {nlStatus === 'success' ? (
              <p style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem', marginTop: 8 }}>OK {nlMsg}</p>
            ) : (
              <form className="footer__newsletter-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Votre adresse e-mail"
                  required
                  value={nlEmail}
                  onChange={e => setNlEmail(e.target.value)}
                  disabled={nlStatus === 'loading'}
                />
                <button type="submit" aria-label="Subscribe" disabled={nlStatus === 'loading'}>
                  {nlStatus === 'loading' ? '...' : '->'}
                </button>
              </form>
            )}
            {nlStatus === 'error' && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 6 }}>{nlMsg}</p>
            )}
            <div className="footer__cursive-text">Makeup is a form of self-love.</div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__copyright">
            &copy; {new Date().getFullYear()} Piove Cosmetics. Tous droits reserves.
          </div>
          <div className="footer__legal">
            <Link to="/conditions">Conditions d'Utilisation</Link>
            <span className="separator">|</span>
            <Link to="/confidentialite">Politique de Confidentialite</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
