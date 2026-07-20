import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { useWishlistStore } from '../store/wishlistStore'
import { getCategories, getProducts } from '../api/products'
import CartDrawer from './CartDrawer'
import './Navbar.css'

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [sugLoading, setSugLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const searchRef = useRef(null)
  const searchWrapRef = useRef(null)
  const navigate = useNavigate()
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const { user, logout } = useAuthStore()
  const wishlistCount = useWishlistStore(s => s.items.length)

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.results || r.data))
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced live search
  useEffect(() => {
    if (query.trim().length < 3) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      setSugLoading(true)
      getProducts({ search: query.trim(), page_size: 6 })
        .then(r => setSuggestions(r.data.results || r.data || []))
        .catch(() => setSuggestions([]))
        .finally(() => setSugLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSuggestions([])
      setSearchOpen(false)
    }
  }

  const goToProduct = (slug) => {
    navigate(`/product/${slug}`)
    setQuery('')
    setSuggestions([])
    setSearchOpen(false)
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner navbar__inner--wide">
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
              {(categories || [])
                .filter(c => c.slug !== 'offres-speciales' && c.slug !== 'offres-speciales')
                .map((c) => (
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
            <Link to="/compte/favoris" className="navbar__icon-btn navbar__wishlist-btn" aria-label="Mes favoris" id="wishlist-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishlistCount > 0 && <span className="navbar__wishlist-count">{wishlistCount}</span>}
            </Link>
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
          <div ref={searchWrapRef} className="navbar__search-wrap">
            <form onSubmit={handleSearch} className="container">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                id="search-input"
                autoComplete="off"
              />
              <button type="submit" id="search-submit-btn">Rechercher</button>
              <button type="button" onClick={() => { setSearchOpen(false); setSuggestions([]) }} className="search-close-btn" id="search-close-btn">✕</button>
            </form>

            {/* Suggestions dropdown */}
            {query.trim().length >= 3 && (
              <div className="search-suggestions">
                {sugLoading && (
                  <div className="search-sug-loading">Recherche...</div>
                )}
                {!sugLoading && suggestions.length === 0 && (
                  <div className="search-sug-empty">Aucun résultat pour « {query} »</div>
                )}
                {!sugLoading && suggestions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="search-sug-item"
                    onMouseDown={() => goToProduct(p.slug)}
                  >
                    <div className="search-sug-img">
                      {p.thumbnail
                        ? <img src={p.thumbnail} alt={p.name} />
                        : <span className="search-sug-no-img">💄</span>
                      }
                    </div>
                    <div className="search-sug-info">
                      <span className="search-sug-name">{p.name}</span>
                      <span className="search-sug-price">{Number(p.price).toLocaleString('fr-DZ')} DA</span>
                    </div>
                  </button>
                ))}
                {!sugLoading && suggestions.length > 0 && (
                  <button type="button" className="search-sug-all" onMouseDown={handleSearch}>
                    Voir tous les résultats pour « {query} »
                  </button>
                )}
              </div>
            )}
          </div>
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
