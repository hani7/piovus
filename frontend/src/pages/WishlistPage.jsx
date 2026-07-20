import { Link } from 'react-router-dom'
import { useWishlistStore } from '../store/wishlistStore'
import { useCartStore } from '../store/cartStore'
import ProductCard from '../components/ProductCard'
import { Heart, ShoppingBag } from 'lucide-react'
import './OrdersPage.css'

export default function WishlistPage() {
  const { items, clear } = useWishlistStore()
  const addItem = useCartStore(s => s.addItem)

  const handleAddAll = () => {
    items.forEach(p => addItem(p, null, 1))
  }

  return (
    <div className="orders-page page-enter">
      <div className="orders-header">
        <h1 className="orders-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={22} color="var(--color-accent)" /> Mes Favoris
        </h1>
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAddAll}
              className="btn btn-accent"
              style={{ fontSize: '0.78rem', padding: '8px 14px' }}
            >
              <ShoppingBag size={15} /> Tout ajouter
            </button>
            <button
              onClick={clear}
              style={{ fontSize: '0.78rem', padding: '8px 14px', background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
            >
              Vider
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="orders-empty">
          <p>Aucun produit dans vos favoris pour le moment.</p>
          <Link to="/shop" className="btn btn-accent" id="wishlist-shop-btn">
            Découvrir nos produits
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
