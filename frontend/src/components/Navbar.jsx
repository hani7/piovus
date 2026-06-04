import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { getCategories } from '../api/products'
import CartDrawer from './CartDrawer'
import './Navbar.css'

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState([])
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const { user, logout } = useAuthStore()

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.results || r.data))
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
    }
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner container">
          {/* Left: Hamburger + Nav links */}
          <div className="navbar__left">
            <button
              className="navbar__hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
              id="hamburger-btn"
            >
              <span /><span /><span />
            </button>
            <nav className="navbar__links">
              <Link to="/shop">Boutique</Link>
              {(categories || []).slice(0, 4).map((c) => (
                <Link key={c.slug} to={`/category/${c.slug}`}>{c.name}</Link>
              ))}
            </nav>
          </div>

          {/* Center: Logo */}
          <Link to="/" className="navbar__logo">
            <img src="/logo.png" alt="Piové Cosmetics" className="navbar__logo-img" />
          </Link>

          {/* Right: Icons */}
          <div className="navbar__actions">
            <button className="navbar__icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Rechercher" id="search-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <Link to="/compte" className="navbar__icon-btn" aria-label="Mon compte" id="account-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {user && <span className="navbar__user-dot" />}
            </Link>
            <button className="navbar__icon-btn navbar__cart-btn" onClick={() => setCartOpen(true)} aria-label="Panier" id="cart-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {cartCount > 0 && <span className="navbar__cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className={`navbar__search-bar ${searchOpen ? 'navbar__search-bar--open' : ''}`}>
          <form onSubmit={handleSearch} className="container">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              id="search-input"
            />
            <button type="submit" id="search-submit-btn">Rechercher</button>
            <button type="button" onClick={() => setSearchOpen(false)} className="search-close-btn" id="search-close-btn">✕</button>
          </form>
        </div>
      </header>

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--open' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <img src="/logo.png" alt="Piové Cosmetics" style={{ height: '30px' }} />
          <button onClick={closeSidebar} className="sidebar__close" id="sidebar-close-btn">✕</button>
        </div>
        <nav className="sidebar__nav">
          <Link to="/" onClick={closeSidebar} className="sidebar__link sidebar__link--home">Accueil</Link>
          <div className="sidebar__section-title">Nos Catégories</div>
          <Link to="/shop" onClick={closeSidebar} className="sidebar__link">Tous les Produits</Link>
          {(categories || []).map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} onClick={closeSidebar} className="sidebar__link">
              {c.name}
              <span className="sidebar__count">{c.product_count}</span>
            </Link>
          ))}
          <div className="sidebar__section-title">Mon Compte</div>
          <Link to="/compte" onClick={closeSidebar} className="sidebar__link">{user ? user.first_name || user.username : 'Se connecter'}</Link>
          {user && (
            <button className="sidebar__link sidebar__link--logout" onClick={() => { logout(); closeSidebar() }}>
              Déconnexion
            </button>
          )}
        </nav>
        <div className="sidebar__footer">
          <p>Livraison dans toute l'Algérie</p>
          <p>Paiement à la livraison</p>
        </div>
      </aside>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
