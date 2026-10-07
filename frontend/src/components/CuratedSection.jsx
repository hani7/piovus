import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../api/products'
import ProductCarousel from './ProductCarousel'
import './CuratedSection.css'

export default function CuratedSection() {
  const [activeTab, setActiveTab] = useState('bestseller')
  const [products, setProducts] = useState({
    bestseller: [],
    promo: [],
    special: []
  })
  const [loading, setLoading] = useState(true)

  const tabs = [
    { id: 'bestseller', label: 'BEST SELLER', subtitle: 'LES INCONTOURNABLES', query: { is_bestseller: true, page_size: 10 }, link: '/shop?bestseller=true' },
    { id: 'promo', label: 'PROMO', subtitle: 'OFFRES LIMITÉES', query: { is_promotion: true, page_size: 10 }, link: '/shop?promo=true' },
    { id: 'special', label: 'OFFRE SPÉCIALE', subtitle: 'BONS PLANS', query: { categories__slug: 'offres-speciales', page_size: 10 }, link: '/offres-speciales' }
  ]

  useEffect(() => {
    const currentTab = tabs.find(t => t.id === activeTab)
    if (products[activeTab].length === 0) {
      setLoading(true)
      getProducts(currentTab.query).then(res => {
        setProducts(prev => ({
          ...prev,
          [activeTab]: res.data.results || res.data
        }))
        setLoading(false)
      })
    }
  }, [activeTab])

  const activeTabData = tabs.find(t => t.id === activeTab)

  return (
    <section className="curated-section">
      {/* Mobile Tabs */}
      <div className="curated-mobile-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            className={`curated-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="curated-layout">
        {/* Desktop Vertical Menu */}
        <div className="curated-sidebar">
          <ul>
            {tabs.map(tab => (
              <li 
                key={tab.id} 
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Carousel Area */}
        <div className="curated-content">
          <div className="curated-header">
            <div>
              <h2 className="curated-title">{activeTabData.label}</h2>
              <div className="curated-subtitle-wrap">
                <span className="curated-subtitle-line"></span>
                <p className="curated-subtitle">{activeTabData.subtitle}</p>
              </div>
            </div>
            <Link to={activeTabData.link} className="curated-view-all">Voir plus &rarr;</Link>
          </div>
          <div className="curated-carousel-wrap">
            {loading ? (
               <div className="spinner" style={{ margin: '40px auto' }} />
            ) : (
               <ProductCarousel products={products[activeTab]} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
