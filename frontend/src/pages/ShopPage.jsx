import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
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
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)

  const selectedCategory = searchParams.get('category') || ''
  const searchQuery = searchParams.get('search') || ''
  const isBestSellers = searchParams.get('best_sellers') === 'true'
  const sortBy = searchParams.get('sort') || (isBestSellers ? '-total_sold' : '-created_at')
  const showNew = searchParams.get('new') === 'true'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const filterBestseller = searchParams.get('bestseller') === 'true'
  const filterPromo = searchParams.get('promo') === 'true'

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = { ordering: sortBy, page }
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
        setTotalCount(r.data.count || r.data.length)
      })
      .finally(() => setLoading(false))
  }, [selectedCategory, searchQuery, sortBy, showNew, isBestSellers, page, minPrice, maxPrice, filterBestseller, filterPromo])

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data.results || r.data))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedCategory, searchQuery, sortBy, showNew, isBestSellers, minPrice, maxPrice, filterBestseller, filterPromo])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const updateParam = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    setSearchParams(p)
  }

  return (
    <main className="shop-page page-enter">
      {/* Breadcrumb */}
      <div className="shop-page__breadcrumb container">
        <Link to="/">Accueil</Link> / {isBestSellers ? <span>Meilleures Ventes</span> : <span>Boutique</span>}
        {selectedCategory && (
          <> / <span>{categories.find(c => c.slug === selectedCategory)?.name}</span></>
        )}
      </div>
      {isBestSellers && (
        <div className="container" style={{ paddingTop: '16px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.04em' }}>⭐ Nos Meilleures Ventes</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>Les produits préférés de nos clientes</p>
        </div>
      )}

      <div className="container shop-page__layout">
        {/* ── Sidebar Filters ─────────────────────── */}
        <aside className="shop-filters">
          <h3 className="shop-filters__title">Filtres</h3>

          {/* Search */}
          <div className="shop-filters__section">
            <p className="shop-filters__label">Recherche</p>
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
          <div className="shop-filters__section">
            <p className="shop-filters__label">Catégories</p>
            <button
              className={`shop-filters__cat ${!selectedCategory ? 'active' : ''}`}
              onClick={() => updateParam('category', '')}
              id="filter-cat-all"
            >
              Tous les produits
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                className={`shop-filters__cat ${selectedCategory === c.slug ? 'active' : ''}`}
                onClick={() => updateParam('category', c.slug)}
                id={`filter-cat-${c.slug}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Price */}
          <div className="shop-filters__section">
            <p className="shop-filters__label">Prix (DA)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('min_price', e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
              <input
                type="number"
                className="form-input"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('max_price', e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="shop-filters__section">
            <p className="shop-filters__label">Filtres spéciaux</p>
            <label className="shop-filters__toggle" htmlFor="filter-bestseller" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="filter-bestseller"
                checked={filterBestseller}
                onChange={(e) => updateParam('bestseller', e.target.checked ? 'true' : '')}
              />
              <span>Best Sellers</span>
            </label>
            <label className="shop-filters__toggle" htmlFor="filter-promo" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="filter-promo"
                checked={filterPromo}
                onChange={(e) => updateParam('promo', e.target.checked ? 'true' : '')}
              />
              <span>En promotion</span>
            </label>
            <label className="shop-filters__toggle" htmlFor="filter-new" style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="filter-new"
                checked={showNew}
                onChange={(e) => updateParam('new', e.target.checked ? 'true' : '')}
              />
              <span>Nouveautés</span>
            </label>
          </div>

          {/* Reset */}
          {(selectedCategory || searchQuery || showNew || minPrice || maxPrice || filterBestseller || filterPromo) && (
            <button
              className="btn btn-outline shop-filters__reset"
              onClick={() => setSearchParams({})}
              id="filter-reset"
            >
              Réinitialiser les filtres
            </button>
          )}
        </aside>

        {/* ── Product Grid ─────────────────────────── */}
        <div className="shop-main">
          <div className="shop-main__toolbar">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-serif)', margin: 0 }}>NOS PRODUITS</h2>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="shop-main__sort"
              id="sort-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : products.length === 0 ? (
            <div className="shop-empty">
              <p>Aucun produit trouvé.</p>
              <button className="btn btn-accent" onClick={() => setSearchParams({})} id="shop-empty-reset">
                Voir tous les produits
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="shop-pagination">
              <button
                className="btn btn-outline"
                disabled={page === 1}
                onClick={() => { setPage(page - 1); window.scrollTo(0,0) }}
                id="page-prev"
              >← Précédent</button>

              {/* Page number buttons */}
              {Array.from({ length: Math.ceil(totalCount / 20) }, (_, i) => i + 1)
                .filter(p => p === 1 || p === Math.ceil(totalCount / 20) || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--color-muted)' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      className={`btn ${p === page ? 'btn-accent' : 'btn-outline'}`}
                      onClick={() => { setPage(p); window.scrollTo(0,0) }}
                      id={`page-num-${p}`}
                      style={{ minWidth: 36 }}
                    >{p}</button>
                  )
                )
              }

              <button
                className="btn btn-outline"
                disabled={page >= Math.ceil(totalCount / 20)}
                onClick={() => { setPage(page + 1); window.scrollTo(0,0) }}
                id="page-next"
              >Suivant →</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
