import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import PageSEO from '../components/PageSEO'
import { getProducts, getCategories } from '../api/products'
import './ShopPage.css'

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Plus récents' },
  { value: '-total_sold', label: 'Meilleures ventes' },
  { value: 'price', label: 'Prix croissant' },
  { value: '-price', label: 'Prix décroissant' },
  { value: 'name', label: 'Nom A-Z' },
]

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 24

  const selectedCategory = searchParams.get('category') || ''
  const searchQuery = searchParams.get('search') || ''
  const isBestSellers = searchParams.get('best_sellers') === 'true'
  const sortBy = searchParams.get('sort') || (isBestSellers ? '-total_sold' : '-created_at')
  const showNew = searchParams.get('new') === 'true'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const filterBestseller = searchParams.get('bestseller') === 'true'
  const filterPromo = searchParams.get('promo') === 'true'

  const hasActiveFilters = selectedCategory || searchQuery || showNew || minPrice || maxPrice || filterBestseller || filterPromo

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = { ordering: sortBy, page_size: PAGE_SIZE, page }
    if (selectedCategory) params['categories__slug'] = selectedCategory
    if (searchQuery) params.search = searchQuery
    if (showNew) params.is_new = true
    if (isBestSellers) params.ordering = '-total_sold'
    if (minPrice) params.price__gte = minPrice
    if (maxPrice) params.price__lte = maxPrice
    if (filterBestseller) params.is_bestseller = true
    if (filterPromo) params.is_promotion = true

    getProducts(params)
      .then((r) => {
        setProducts(r.data.results || r.data)
        setTotalCount(r.data.count || (r.data.results || r.data).length)
      })
      .finally(() => setLoading(false))
  }, [selectedCategory, searchQuery, sortBy, showNew, isBestSellers, minPrice, maxPrice, filterBestseller, filterPromo, page])

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.results || r.data))
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [selectedCategory, searchQuery, sortBy, showNew, isBestSellers, minPrice, maxPrice, filterBestseller, filterPromo])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const updateParam = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    setSearchParams(p)
  }

  // Memoized grouped entries (only when no active filters)
  const groupEntries = useMemo(() => {
    if (hasActiveFilters) return null
    const g = {}
    products.forEach((p) => {
      const catName = p.categories?.[0]?.name || 'Autres'
      if (!g[catName]) g[catName] = []
      g[catName].push(p)
    })
    return Object.entries(g)
  }, [products, hasActiveFilters])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <main className="shop-page page-enter">
      <PageSEO
        title={selectedCategory
          ? `${categories.find(c => c.slug === selectedCategory)?.name || selectedCategory} — Boutique`
          : 'Tous nos produits'}
        description={`Explorez notre gamme de produits de beauté Piové Cosmetics. Maquillage, soins et accessoires — livraison dans toute l'Algérie.`}
        url="/shop"
      />

      {/* ── Filter Drawer Overlay */}
      {drawerOpen && (
        <div className="filter-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Filter Drawer (left side) */}
      <aside className={`filter-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="filter-drawer__header">
          <h3>Filtres</h3>
          <button className="filter-drawer__close" onClick={() => setDrawerOpen(false)} id="drawer-close">✕</button>
        </div>

        {/* Sort */}
        <div className="filter-drawer__section">
          <p className="filter-drawer__label">Trier par</p>
          <select
            value={sortBy}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="form-input"
            id="sort-select"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="filter-drawer__section">
          <p className="filter-drawer__label">Recherche</p>
          <input
            className="form-input"
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => updateParam('search', e.target.value)}
            id="filter-search"
          />
        </div>

        {/* Categories */}
        <div className="filter-drawer__section">
          <p className="filter-drawer__label">Catégories</p>
          <button
            className={`filter-cat-btn ${!selectedCategory ? 'active' : ''}`}
            onClick={() => updateParam('category', '')}
            id="filter-cat-all"
          >Tous les produits</button>
          {categories.map((c) => (
            <button
              key={c.slug}
              className={`filter-cat-btn ${selectedCategory === c.slug ? 'active' : ''}`}
              onClick={() => { updateParam('category', c.slug); setDrawerOpen(false) }}
              id={`filter-cat-${c.slug}`}
            >{c.name}</button>
          ))}
        </div>

        {/* Price */}
        <div className="filter-drawer__section">
          <p className="filter-drawer__label">Prix (DA)</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" className="form-input" placeholder="Min" value={minPrice}
              onChange={(e) => updateParam('min_price', e.target.value)} style={{ padding: '8px' }} />
            <input type="number" className="form-input" placeholder="Max" value={maxPrice}
              onChange={(e) => updateParam('max_price', e.target.value)} style={{ padding: '8px' }} />
          </div>
        </div>

        {/* Tags */}
        <div className="filter-drawer__section">
          <p className="filter-drawer__label">Filtres spéciaux</p>
          <label className="filter-toggle">
            <input type="checkbox" checked={filterBestseller}
              onChange={(e) => updateParam('bestseller', e.target.checked ? 'true' : '')} />
            <span>⭐ Best Sellers</span>
          </label>
          <label className="filter-toggle">
            <input type="checkbox" checked={filterPromo}
              onChange={(e) => updateParam('promo', e.target.checked ? 'true' : '')} />
            <span>🏷️ En promotion</span>
          </label>
          <label className="filter-toggle">
            <input type="checkbox" checked={showNew}
              onChange={(e) => updateParam('new', e.target.checked ? 'true' : '')} />
            <span>✨ Nouveautés</span>
          </label>
        </div>

        {hasActiveFilters && (
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem' }}
            onClick={() => { setSearchParams({}); setDrawerOpen(false) }} id="filter-reset">
            ✕ Réinitialiser les filtres
          </button>
        )}
      </aside>

      {/* ── Breadcrumb */}
      <div className="shop-page__breadcrumb container">
        <Link to="/">Accueil</Link> / <span>Boutique</span>
        {selectedCategory && (
          <> / <span>{categories.find(c => c.slug === selectedCategory)?.name}</span></>
        )}
      </div>

      {/* ── Toolbar: title + filter button (mobile only) */}
      <div className="container shop-toolbar">
        <h2 className="shop-toolbar__title">NOS PRODUITS</h2>
        <button
          className={`shop-filter-btn ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setDrawerOpen(true)}
          id="open-filter-drawer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filtrer
          {hasActiveFilters && <span className="shop-filter-btn__dot" />}
        </button>
      </div>

      {/* ── Desktop layout: sidebar sticky + products */}
      <div className="container shop-page__body">

        {/* Sidebar Desktop (visible on ≥992px only via CSS) */}
        <aside className="shop-sidebar-desktop">
          <div className="filter-drawer__section">
            <p className="filter-drawer__label">Trier par</p>
            <select value={sortBy} onChange={(e) => updateParam('sort', e.target.value)} className="form-input" id="sort-select-desktop">
              {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div className="filter-drawer__section">
            <p className="filter-drawer__label">Recherche</p>
            <input className="form-input" type="text" placeholder="Rechercher..." value={searchQuery}
              onChange={(e) => updateParam('search', e.target.value)} id="filter-search-desktop" />
          </div>
          <div className="filter-drawer__section">
            <p className="filter-drawer__label">Catégories</p>
            <button className={`filter-cat-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => updateParam('category', '')} id="filter-cat-all-desktop">Tous les produits</button>
            {categories.map((c) => (
              <button key={c.slug}
                className={`filter-cat-btn ${selectedCategory === c.slug ? 'active' : ''}`}
                onClick={() => updateParam('category', c.slug)}
                id={`filter-cat-desktop-${c.slug}`}>{c.name}</button>
            ))}
          </div>
          <div className="filter-drawer__section">
            <p className="filter-drawer__label">Prix (DA)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" className="form-input" placeholder="Min" value={minPrice}
                onChange={(e) => updateParam('min_price', e.target.value)} style={{ padding: '8px' }} />
              <input type="number" className="form-input" placeholder="Max" value={maxPrice}
                onChange={(e) => updateParam('max_price', e.target.value)} style={{ padding: '8px' }} />
            </div>
          </div>
          <div className="filter-drawer__section">
            <p className="filter-drawer__label">Filtres spéciaux</p>
            <label className="filter-toggle">
              <input type="checkbox" checked={filterBestseller}
                onChange={(e) => updateParam('bestseller', e.target.checked ? 'true' : '')} />
              <span>⭐ Best Sellers</span>
            </label>
            <label className="filter-toggle">
              <input type="checkbox" checked={filterPromo}
                onChange={(e) => updateParam('promo', e.target.checked ? 'true' : '')} />
              <span>🏷️ En promotion</span>
            </label>
            <label className="filter-toggle">
              <input type="checkbox" checked={showNew}
                onChange={(e) => updateParam('new', e.target.checked ? 'true' : '')} />
              <span>✨ Nouveautés</span>
            </label>
          </div>
          {hasActiveFilters && (
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem' }}
              onClick={() => setSearchParams({})} id="filter-reset-desktop">
              ✕ Réinitialiser
            </button>
          )}
        </aside>

        {/* Products area */}
        <div className="shop-products-wrapper">
          <div className="shop-products-area">
            {loading ? (
              <div className="products-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton skeleton-img--tall" />
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton skeleton-text skeleton-text--short" />
                    <div className="skeleton skeleton-text" style={{ width: '55%', marginTop: 8 }} />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="shop-empty">
                <p>Aucun produit trouvé.</p>
                <button className="btn btn-accent" onClick={() => setSearchParams({})} id="shop-empty-reset">
                  Voir tous les produits
                </button>
              </div>
            ) : groupEntries ? (
              // ONE flat grid — category labels span all columns as dividers
              <div className="products-grid">
                {groupEntries.map(([catName, catProducts]) => (
                  <>
                    <div key={`label-${catName}`} className="shop-category-divider">
                      {catName}
                    </div>
                    {catProducts.map(p => <ProductCard key={p.id} product={p} />)}
                  </>
                ))}
              </div>
            ) : (
              <div className="products-grid">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <nav className="shop-pagination" aria-label="Pagination">
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  aria-label="Page précédente"
                >← Précédent</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`e-${i}`} className="shop-pagination__ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`btn ${p === page ? 'btn-accent' : 'btn-outline'}`}
                        onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                      >{p}</button>
                    )
                  )}

                <button
                  className="btn btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  aria-label="Page suivante"
                >Suivant →</button>
              </nav>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
