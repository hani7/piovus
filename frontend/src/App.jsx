import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import client from './api/client'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import B2BHomePage from './pages/B2BHomePage'
import ShopPage from './pages/ShopPage'
import { useAuthStore } from './store/authStore'
import ProductPage from './pages/ProductPage'
import CategoryPage from './pages/CategoryPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import AccountPage from './pages/AccountPage'
import OrdersPage from './pages/OrdersPage'
import AddressesPage from './pages/AddressesPage'
import SettingsPage from './pages/SettingsPage'
import PromoBanner from './components/PromoBanner'
import PromoPopup from './components/PromoPopup'
import MaintenancePage from './pages/MaintenancePage'

// Admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminOrders from './pages/admin/AdminOrders'
import AdminOrderCreate from './pages/admin/AdminOrderCreate'
import AdminOrderDetail from './pages/admin/AdminOrderDetail'
import AdminBanners from './pages/admin/AdminBanners'
import AdminDeliveryCompanies from './pages/admin/AdminDeliveryCompanies'
import AdminDeliveryRates from './pages/admin/AdminDeliveryRates'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminBlacklist from './pages/admin/AdminBlacklist'
import AdminB2BRequests from './pages/admin/AdminB2BRequests'
import AdminNewsletter from './pages/admin/AdminNewsletter'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminReports from './pages/admin/AdminReports'
import AdminUserHistory from './pages/admin/AdminUserHistory'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin-panel')
  const user = useAuthStore(s => s.user)
  const isB2B = user?.profile?.is_b2b
  
  const [settings, setSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    client.get('/settings/')
      .then(res => setSettings(res.data))
      .catch(console.error)
      .finally(() => setLoadingSettings(false))
  }, [])

  if (loadingSettings) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>
  }

  if (settings?.is_maintenance_mode && !isAdmin) {
    return <MaintenancePage message={settings?.maintenance_message} />
  }

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <PromoBanner />}
      {!isAdmin && <Navbar />}
      <Routes>
        {/* Public store */}
        <Route path="/" element={isB2B ? <B2BHomePage /> : <HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/produit/:slug" element={<ProductPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/compte" element={<AccountPage />} />
        <Route path="/compte/commandes" element={<OrdersPage />} />
        <Route path="/compte/adresses" element={<AddressesPage />} />
        <Route path="/compte/parametres" element={<SettingsPage />} />

        {/* Admin */}
        <Route path="/admin-panel/login" element={<AdminLogin />} />
        <Route path="/admin-panel" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders-b2b" element={<AdminOrders isB2B={true} />} />
          <Route path="orders/new" element={<AdminOrderCreate isB2B={false} />} />
          <Route path="orders-b2b/new" element={<AdminOrderCreate isB2B={true} />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="delivery-companies" element={<AdminDeliveryCompanies />} />
          <Route path="delivery-rates" element={<AdminDeliveryRates />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="b2b-requests" element={<AdminB2BRequests />} />
          <Route path="blacklist" element={<AdminBlacklist />} />
          <Route path="newsletter" element={<AdminNewsletter />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="history" element={<AdminUserHistory />} />
        </Route>
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && pathname === '/' && <PromoPopup />}
    </>
  )
}
