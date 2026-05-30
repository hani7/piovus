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
      const cat = catList.find((c) => c.slug === slug)
      setCategory(cat)
      
      const allBanners = bans.data.results || bans.data
      setCategoryBanners(allBanners.filter(b => b.placement === 'category_banner' && b.is_active && (!b.category || b.category === cat?.id)))
    }).finally(() => setLoading(false))
  }, [slug, page])

  useEffect(() => {
    setPage(1)
  }, [slug])

  return (
    <main className="category-page page-enter">
      <div className="category-page__hero">
        <div className="container">
          <nav className="product-page__breadcrumb" style={{marginBottom:'8px'}}>
            <Link to="/">Accueil</Link> / <Link to="/shop">Produits</Link> / <span>{category?.name || slug}</span>
          </nav>
          <h1 className="category-page__title">{category?.name || slug}</h1>
          <p className="category-page__count">{totalCount} produit{totalCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="container" style={{padding:'40px var(--gutter) 80px'}}>
        {categoryBanners.length > 0 && (
          <div className="category-banners" style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categoryBanners.map(banner => (
              <a key={banner.id} href={banner.cta_url || '#'} className="category-banner-link" style={{ display: 'block', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <img 
                  src={banner.image} 
                  alt={banner.title} 
                  style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} 
                />
              </a>
            ))}
          </div>
        )}

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
