import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import client from './api/client'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import MobileBottomNav from './components/MobileBottomNav'
const HomePage = lazy(() => import('./pages/HomePage'))
const B2BHomePage = lazy(() => import('./pages/B2BHomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
import { useAuthStore } from './store/authStore'
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AccountLayout = lazy(() => import('./pages/AccountLayout'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const AddressesPage = lazy(() => import('./pages/AddressesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'))
import PromoBanner from './components/PromoBanner'
import PromoPopup from './components/PromoPopup'
import SideBanners from './components/SideBanners'
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))

// Admin
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminOrderHistory = lazy(() => import('./pages/admin/AdminOrderHistory'))
const AdminOrderCreate = lazy(() => import('./pages/admin/AdminOrderCreate'))
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'))
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'))
const AdminDeliveryCompanies = lazy(() => import('./pages/admin/AdminDeliveryCompanies'))
const AdminDeliveryRates = lazy(() => import('./pages/admin/AdminDeliveryRates'))
const AdminB2BDeliveryRates = lazy(() => import('./pages/admin/AdminB2BDeliveryRates'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'))
const AdminBlacklist = lazy(() => import('./pages/admin/AdminBlacklist'))
const AdminB2BRequests = lazy(() => import('./pages/admin/AdminB2BRequests'))
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter'))
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminUserHistory = lazy(() => import('./pages/admin/AdminUserHistory'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminMediatheque = lazy(() => import('./pages/admin/AdminMediatheque'))
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/piove-secure-2026')
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

  // Inject TikTok Pixel dynamically
  useEffect(() => {
    if (!settings?.tiktok_pixel_id) return
    if (document.getElementById('tiktok-pixel-script')) return
    const pixelId = settings.tiktok_pixel_id
    const script = document.createElement('script')
    script.id = 'tiktok-pixel-script'
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `
    document.head.appendChild(script)
  }, [settings?.tiktok_pixel_id])

  // Source detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let source = params.get('utm_source') || params.get('ref') || params.get('source')
    const utmMedium = params.get('utm_medium') || ''
    const utmCampaign = params.get('utm_campaign') || ''
    const fbclid = params.get('fbclid')
    
    // Auto-detect from ad click IDs or referrer
    if (!source) {
      if (fbclid) {
        source = 'fb'
      } else if (document.referrer) {
        const ref = document.referrer.toLowerCase()
        if (ref.includes('facebook.com') || ref.includes('fb.me') || ref.includes('instagram.com/l.php')) source = 'fb'
        else if (ref.includes('instagram.com')) source = 'ig'
        else if (ref.includes('tiktok.com')) source = 'tiktok'
        else if (ref.includes('google.')) source = 'google'
        else if (ref.includes('piovecosmetics.com') || ref.includes('piovecosmetics.dz')) source = 'direct'
        else source = 'referral'
      }
    }
    
    // Normalize base source
    if (source) {
      source = source.toLowerCase()
      if (source.includes('facebook') || source === 'fb') source = 'fb'
      else if (source.includes('instagram') || source === 'ig') source = 'ig'
      else if (source.includes('tiktok')) source = 'tiktok'
      else if (source.includes('google')) source = 'google'
    }

    let fullOrigin = source || 'direct';
    
    // Add extra tracking infos
    const extras = [];
    if (utmMedium) extras.push(`md:${utmMedium}`);
    if (utmCampaign) extras.push(`cp:${utmCampaign}`);
    if (fbclid) extras.push(`fbclid`);

    if (extras.length > 0) {
        fullOrigin = `${fullOrigin} | ${extras.join(' | ')}`;
    }

    // Limit length to match backend max_length (100)
    fullOrigin = fullOrigin.substring(0, 100);

    const existing = localStorage.getItem('order_source');
    const hasTrackingParams = params.get('utm_source') || params.get('ref') || params.get('source') || utmMedium || utmCampaign || fbclid;
    
    if (hasTrackingParams || !existing) {
      localStorage.setItem('order_source', fullOrigin)
    }
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
      {!isAdmin && <SideBanners />}
      <Suspense fallback={<div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Chargement...</div>}>
        <Routes>
          {/* Public store */}
          <Route path="/" element={isB2B ? <B2BHomePage /> : <HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/compte" element={<AccountPage />} />
          <Route element={<AccountLayout />}>
            <Route path="/compte/commandes" element={<OrdersPage />} />
            <Route path="/compte/adresses" element={<AddressesPage />} />
            <Route path="/compte/fidelite" element={<LoyaltyPage />} />
            <Route path="/compte/parametres" element={<SettingsPage />} />
          </Route>
          <Route path="/payment-result" element={<PaymentResultPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/livraison" element={<ShippingPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/conditions" element={<TermsPage />} />

          {/* Admin */}
          <Route path="/piove-secure-2026/login" element={<AdminLogin />} />
          <Route path="/piove-secure-2026" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders-b2b" element={<AdminOrders isB2B={true} />} />
            <Route path="orders-history" element={<AdminOrderHistory />} />
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
            <Route path="mediatheque" element={<AdminMediatheque />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
        </Routes>
      </Suspense>
      {!isAdmin && <MobileBottomNav />}
      {!isAdmin && <Footer />}
      {!isAdmin && pathname === '/' && <PromoPopup />}
    </>
  )
}

