import client from './client'

export const getCategories = () => client.get('/categories/')
export const getProducts = (params = {}) => client.get('/products/', { params })
export const getProduct = (slug) => client.get(`/products/${slug}/`)
export const getRelatedProducts = async (slug) => {
  const res = await client.get(`/products/${slug}/related/`)
  return res.data
}
export const getFeaturedProducts = () => client.get('/products/featured/')
export const getNewArrivals = () => client.get('/products/new-arrivals/')
export const getPromotions = () => client.get('/products/promotions/')
export const getProductsByCategory = (slug, params = {}) =>
  client.get(`/products/by-category/${slug}/`, { params })
export const getBanners = () => client.get('/banners/')
