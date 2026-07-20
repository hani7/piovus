import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import './MobileBottomNav.css'

export default function MobileBottomNav() {
  const location = useLocation()
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const wishlistCount = useWishlistStore(s => s.items.length)

  return (
    <nav className="mobile-bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Accueil</span>
      </Link>
      <Link to="/shop" className={`nav-item ${location.pathname.startsWith('/shop') || location.pathname.startsWith('/category') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Boutique</span>
      </Link>
      <Link to="/cart" className={`nav-item ${location.pathname === '/cart' ? 'active' : ''}`}>
        <div className="nav-item-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </div>
        <span>Panier</span>
      </Link>
      <Link to="/compte/favoris" className={`nav-item ${location.pathname === '/compte/favoris' ? 'active' : ''}`}>
        <div className="nav-item-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
        </div>
        <span>Favoris</span>
      </Link>
      <Link to="/compte" className={`nav-item ${location.pathname.startsWith('/compte') && location.pathname !== '/compte/favoris' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Compte</span>
      </Link>
    </nav>
  )
}
