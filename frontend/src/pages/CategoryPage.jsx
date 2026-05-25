import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import { getProductsByCategory, getCategories } from '../api/products'
import './CategoryPage.css'

export default function CategoryPage() {
  const { slug } = useParams()
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getProductsByCategory(slug), getCategories()]).then(([prods, cats]) => {
      setProducts(prods.data.results || prods.data)
      const catList = cats.data.results || cats.data
      const cat = catList.find((c) => c.slug === slug)
      setCategory(cat)
    }).finally(() => setLoading(false))
  }, [slug])

  return (
    <main className="category-page page-enter">
      <div className="category-page__hero">
        <div className="container">
          <nav className="product-page__breadcrumb" style={{marginBottom:'8px'}}>
            <Link to="/">Accueil</Link> / <Link to="/shop">Produits</Link> / <span>{category?.name || slug}</span>
          </nav>
          <h1 className="category-page__title">{category?.name || slug}</h1>
          <p className="category-page__count">{products.length} produits</p>
        </div>
      </div>
      <div className="container" style={{padding:'40px var(--gutter) 80px'}}>
        {loading ? <div className="spinner" /> : (
          <div className="products-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
  )
}
