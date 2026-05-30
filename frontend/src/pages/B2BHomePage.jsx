import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { getCategories, getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import './B2BHomePage.css'
import { useAuthStore } from '../store/authStore'

export default function B2BHomePage() {
  const user = useAuthStore(s => s.user)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCategories(),
      getProducts({ limit: 12 }) // Fetch a few products for the grid
    ])
      .then(([catsRes, prodsRes]) => {
        setCategories(catsRes.data.results || catsRes.data)
        setProducts(prodsRes.data.results || prodsRes.data)
      })
      .catch(err => console.error("Error fetching B2B data:", err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="b2b-homepage page-enter">
      
      {/* Hero / Greeting */}
      <section className="b2b-hero">
        <div className="container">
          <h1>Espace Professionnel</h1>
          <p>Bienvenue {user?.profile?.company_name || user?.username}, commandez rapidement aux tarifs de gros.</p>
        </div>
      </section>

      {/* Categories Icons Strip */}
      <section className="b2b-categories-wrapper">
        <div className="container">
          <div className="b2b-categories-scroll">
            <Link to="/shop" className="b2b-cat-item">
              <div className="b2b-cat-icon">
                <ShoppingBag size={28} />
              </div>
              <span className="b2b-cat-name">Tout voir</span>
            </Link>
            
            {(categories || []).map(cat => (
              <Link key={cat.slug} to={`/category/${cat.slug}`} className="b2b-cat-item">
                <div className="b2b-cat-icon">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} loading="lazy" />
                  ) : (
                    <span>{cat.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="b2b-cat-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Fast Ordering Grid */}
      <section className="container">
        <div className="b2b-section-header">
          <h2 className="b2b-section-title">Catalogue Rapide</h2>
          <Link to="/shop" className="b2b-shop-link">
            Recherche avancée <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="products-grid">
            {(products || []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/shop" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '1.1rem' }}>
            Accéder à la Boutique Complète
          </Link>
        </div>
      </section>

    </main>
  )
}
