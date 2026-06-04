import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import { getProductsByCategory, getCategories, getBanners } from '../api/products'
import './CategoryPage.css'

export default function CategoryPage() {
  const { slug } = useParams()
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryBanners, setCategoryBanners] = useState([])

  useEffect(() => {
    setLoading(true)
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
    }).finally(() => setLoading(false))
  }, [slug, page])

  useEffect(() => {
    setPage(1)
  }, [slug])

  return (
    <main className="category-page page-enter">
      <div className="category-page__hero">
        <div className="container">
          <h1 className="category-page__title">{category?.name || slug}</h1>
        </div>
      </div>

      {/* ── Bannières de Catégorie (Full Width ou Contenues) ── */}
      {categoryBanners.length > 0 && (
        <div className="container">
          <div className="category-banners" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categoryBanners.map(banner => (
              <a key={banner.id} href={banner.cta_url || '#'} className="category-banner-link" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <img 
                  src={banner.image} 
                  alt={banner.title} 
                  style={{ width: '100%', height: 'auto', maxHeight: '350px', objectFit: 'cover', display: 'block' }} 
                />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{padding: categoryBanners.length > 0 ? '40px var(--gutter) 80px' : '40px var(--gutter) 80px'}}>

        {loading ? <div className="spinner" /> : (
          <>
            <div className="products-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            
            {/* Pagination */}
            {totalCount > 20 && (
              <div className="shop-pagination" style={{marginTop: '40px'}}>
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => { setPage(page - 1); window.scrollTo(0,0) }}
                >← Précédent</button>

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
                        style={{ minWidth: 36 }}
                      >{p}</button>
                    )
                  )
                }

                <button
                  className="btn btn-outline"
                  disabled={page >= Math.ceil(totalCount / 20)}
                  onClick={() => { setPage(page + 1); window.scrollTo(0,0) }}
                >Suivant →</button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
