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
import LoyaltyPage from './pages/LoyaltyPage'
import PromoBanner from './components/PromoBanner'
import PromoPopup from './components/PromoPopup'
import SideBanners from './components/SideBanners'
import MaintenancePage from './pages/MaintenancePage'
import PaymentResultPage from './pages/PaymentResultPage'

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
import AdminB2BDeliveryRates from './pages/admin/AdminB2BDeliveryRates'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminBlacklist from './pages/admin/AdminBlacklist'
import AdminB2BRequests from './pages/admin/AdminB2BRequests'
import AdminNewsletter from './pages/admin/AdminNewsletter'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminReports from './pages/admin/AdminReports'
import AdminUserHistory from './pages/admin/AdminUserHistory'
import AdminSettings from './pages/admin/AdminSettings'

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

  // Inject Meta Pixel dynamically
  useEffect(() => {
    if (!settings?.meta_pixel_id) return
    if (document.getElementById('meta-pixel-script')) return
    const pixelId = settings.meta_pixel_id
    const script = document.createElement('script')
    script.id = 'meta-pixel-script'
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${pixelId}');fbq('track','PageView');
    `
    document.head.appendChild(script)
    const noscript = document.createElement('noscript')
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`
    document.head.appendChild(noscript)
  }, [settings?.meta_pixel_id])

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
      {!isAdmin && <SideBanners />}
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
        <Route path="/compte/fidelite" element={<LoyaltyPage />} />
        <Route path="/compte/parametres" element={<SettingsPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />

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
          <Route path="b2b-delivery-rates" element={<AdminB2BDeliveryRates />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="b2b-requests" element={<AdminB2BRequests />} />
          <Route path="blacklist" element={<AdminBlacklist />} />
          <Route path="newsletter" element={<AdminNewsletter />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="history" element={<AdminUserHistory />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && pathname === '/' && <PromoPopup />}
    </>
  )
}
