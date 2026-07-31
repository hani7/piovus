import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import PageSEO from '../components/PageSEO'
import { getProductsByCategory, getCategories, getBanners } from '../api/products'
import mediaUrl from '../api/mediaUrl'
import './CategoryPage.css'

export default function CategoryPage() {
  const { slug } = useParams()
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryBanners, setCategoryBanners] = useState([])

  useEffect(() => {
    if (!category || category.slug !== slug) setLoading(true)
    setIsFetching(true)
    Promise.all([
      getProductsByCategory(slug, { page }), 
      getCategories(),
      getBanners()
    ]).then(([prods, cats, bans]) => {
      setProducts(prods.data.results || prods.data)
      setTotalCount(prods.data.count || prods.data.length || 0)
      
      const catList = cats.data.results || cats.data
      const currentCat = catList.find((c) => c.slug === slug)
      setCategory(currentCat)
      
      const allBanners = bans.data.results || bans.data
      // On filtre les bannières actives, de type category_banner, et soit globales (sans catégorie), soit spécifiques à cette catégorie
      const validBanners = allBanners.filter(b => {
        if (b.placement !== 'category_banner' || b.is_active === false) return false
        if (!b.category) return true // Global category banner
        return currentCat && b.category === currentCat.id
      })
      setCategoryBanners(validBanners)
    }).finally(() => { setLoading(false); setIsFetching(false) })
  }, [slug, page])

  useEffect(() => {
    setPage(1)
  }, [slug])

  return (
    <main className="category-page page-enter">
      <PageSEO
        title={category?.name || slug}
        description={`Découvrez notre collection ${category?.name || ''} chez Piové Cosmetics. Maquillage et soins de qualité — livraison dans toute l'Algérie.`}
        url={`/${slug}`}
      />
      {/* Hero Banner (admin-managed) */}
      <div
        className="category-page__hero"
        style={{
          backgroundImage: categoryBanners.length > 0 ? `url(${mediaUrl(categoryBanners[0].image)})` : 'none',
        }}
      >
        <div className="category-page__hero-overlay" />
        <div className="category-page__hero-content">
          <h1 className="category-page__title">{category?.name || slug}</h1>
        </div>
      </div>

      {/* Banners supp (2e, 3e...) en dessous si plusieurs */}
      {categoryBanners.length > 1 && (
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            {categoryBanners.slice(1).map(banner => (
              <a key={banner.id} href={banner.cta_url || '#'} style={{ display: 'block', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={mediaUrl(banner.image)} alt={banner.title} style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{padding: categoryBanners.length > 0 ? '40px var(--gutter) 80px' : '40px var(--gutter) 80px', position: 'relative'}}>

        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-img--tall" />
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text skeleton-text--short" />
                <div className="skeleton skeleton-text" style={{ width: '55%', marginTop: 8 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: isFetching ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: isFetching ? 'none' : 'auto' }}>
            <div className="products-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            
            {/* Pagination */}
            {totalCount > 20 && (
              <nav className="shop-pagination" aria-label="Pagination">
                <button
                  className="shop-pagination__arrow"
                  disabled={page === 1}
                  onClick={() => { setPage(page - 1); window.scrollTo(0,0) }}
                  aria-label="Page précédente"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>

                {Array.from({ length: Math.ceil(totalCount / 20) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(totalCount / 20) || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="shop-pagination__ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`shop-pagination__page ${p === page ? 'active' : ''}`}
                        onClick={() => { setPage(p); window.scrollTo(0,0) }}
                        aria-label={`Page ${p}`}
                      >{p}</button>
                    )
                  )
                }

                <button
                  className="shop-pagination__arrow"
                  disabled={page >= Math.ceil(totalCount / 20)}
                  onClick={() => { setPage(page + 1); window.scrollTo(0,0) }}
                  aria-label="Page suivante"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
