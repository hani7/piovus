import { useState, useEffect } from 'react'
import { getProductsByCategory } from '../api/products'
import ProductCarousel from './ProductCarousel'

export default function CategoryCarouselSection({ category }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getProductsByCategory(category.slug, { limit: 10 }) // Adjust limit as needed
      .then((res) => {
        if (mounted) {
          setProducts(res.data.results || res.data)
        }
      })
      .catch((err) => console.error('Failed to fetch category products', err))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [category.slug])

  if (!loading && products.length === 0) {
    return null
  }

  return (
    <ProductCarousel
      title={category.name}
      products={products}
      isLoading={loading}
    />
  )
}
