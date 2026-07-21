import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useWishlistStore } from '../store/wishlistStore'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { LayoutDashboard, Package, MapPin, Settings, LogOut, ChevronRight, Gift, Heart } from 'lucide-react'
import client from '../api/client'
import './AccountPage.css'

const GOOGLE_CLIENT_ID = "746718168962-ff9ui2vodk8emeioidd6ka5ai1p9qjos.apps.googleusercontent.com"
const FACEBOOK_APP_ID = "FACEBOOK_APP_ID_PLACEHOLDER"

export default function AccountPage() {
  const { user, login, register, registerB2B, socialLoginAction, isLoading, error, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')
  const { items: wishlistItems } = useWishlistStore()

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '', phone: '', password: '', password2: ''
  })
  const [b2bForm, setB2bForm] = useState({
    company_name: '', nrc: '', nif: '', first_name: '', last_name: '', username: '', email: '', phone: '', password: '', password2: '', nrc_file: null
  })

  // KPI stats
  const [kpi, setKpi] = useState({ ordersCount: null, lastOrder: null })
  useEffect(() => {
    if (user) {
      client.get('/orders/').then(res => {
        const orders = Array.isArray(res.data) ? res.data : (res.data.results || [])
        const last = orders[0]
        setKpi({
          ordersCount: orders.length,
          lastOrder: last ? { date: last.created_at, status: last.status } : null
        })
      }).catch(() => {})
    }
  }, [user])

  if (user) {
    const navItems = [
      { to: '/compte',            label: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
      { to: '/compte/commandes',  label: 'Commandes',       icon: <Package size={18} /> },
      { to: '/compte/adresses',   label: 'Adresses',        icon: <MapPin size={18} /> },
      { to: '/compte/fidelite',   label: 'Fidélité',        icon: <Gift size={18} /> },
      { to: '/compte/favoris',    label: 'Favoris',         icon: <Heart size={18} /> },
      { to: '/compte/parametres', label: 'Paramètres',      icon: <Settings size={18} /> },
    ]
    return (
      <main className="account-page page-enter" style={{ paddingTop: '80px' }}>
        <div className="container">

          {/* Mobile tab bar */}
          <div className="account-tab-bar">
            {navItems.map(({ to, label, icon }) => (
              <Link key={to} to={to} className={`account-tab-item ${to === '/compte' ? 'active' : ''}`}>
                {icon}<span>{label}</span>
              </Link>
            ))}
            <button className="account-tab-item text-danger" onClick={logout}>
              <LogOut size={18} /><span>Sortir</span>
            </button>
          </div>

          {/* Desktop layout */}
          <div className="account-dashboard-wrapper">
            {/* Sidebar (desktop only) */}
            <aside className="account-sidebar account-sidebar--desktop">
              <div className="account-sidebar__profile">
                <div className="account-avatar-large">
                  {user.first_name?.charAt(0) || user.username?.charAt(0)}
                </div>
                <h3>{user.first_name || user.username}</h3>
                <p>{user.email}</p>
              </div>
              <nav className="account-sidebar__nav">
                <Link to="/compte" className="account-nav-item active"><LayoutDashboard size={20} /> Tableau de bord</Link>
                <Link to="/compte/commandes" className="account-nav-item"><Package size={20} /> Mes Commandes</Link>
                <Link to="/compte/adresses" className="account-nav-item"><MapPin size={20} /> Mes Adresses</Link>
                <Link to="/compte/fidelite" className="account-nav-item"><Gift size={20} /> Fidélité &amp; Portefeuille</Link>
                <Link to="/compte/parametres" className="account-nav-item"><Settings size={20} /> Paramètres</Link>
                <button className="account-nav-item text-danger" onClick={logout}><LogOut size={20} /> Déconnexion</button>
              </nav>
            </aside>

            {/* Main Content */}
            <section className="account-content">
              <div className="account-welcome-banner glassmorphism">
                <div className="banner-text">
                  <h1>Bienvenue, {user.first_name || user.username} 👋</h1>
                  <p>Gérez vos commandes, adresses et préférences depuis votre espace personnel.</p>
                </div>
              </div>

              {/* KPI Bar */}
              <div className="account-kpi-bar">
                <div className="account-kpi-item">
                  <span className="account-kpi-value">
                    {kpi.ordersCount === null ? '…' : kpi.ordersCount}
                  </span>
                  <span className="account-kpi-label">Commandes</span>
                </div>
                <div className="account-kpi-item">
                  <span className="account-kpi-value" style={{ color: 'var(--color-accent)' }}>
                    {user.profile?.loyalty_points ?? '—'}
                  </span>
                  <span className="account-kpi-label">Points fidélité</span>
                </div>
                <div className="account-kpi-item">
                  <span className="account-kpi-value">{wishlistItems.length}</span>
                  <span className="account-kpi-label">Favoris</span>
                </div>
                <div className="account-kpi-item">
                  <span className="account-kpi-value" style={{ fontSize: '0.85rem' }}>
                    {kpi.lastOrder ? new Date(kpi.lastOrder.date).toLocaleDateString('fr-DZ', { day:'2-digit', month:'short' }) : '—'}
                  </span>
                  <span className="account-kpi-label">Dernière cmd</span>
                </div>
              </div>

              <h2 className="section-title">Aperçu de votre compte</h2>
              <div className="account-dashboard__cards">
                <Link to="/compte/commandes" className="account-card premium-card" id="account-orders">
                  <div className="card-icon-wrapper"><Package size={24} /></div>
                  <div className="card-info">
                    <h3>Mes Commandes</h3>
                    <p>{kpi.ordersCount !== null ? `${kpi.ordersCount} commande${kpi.ordersCount !== 1 ? 's' : ''} passée${kpi.ordersCount !== 1 ? 's' : ''}` : 'Consulter l\'historique'}</p>
                  </div>
                  <ChevronRight size={20} className="card-chevron" />
                </Link>
                <Link to="/compte/adresses" className="account-card premium-card">
                  <div className="card-icon-wrapper"><MapPin size={24} /></div>
                  <div className="card-info"><h3>Mes Adresses</h3><p>Gérer vos adresses de livraison</p></div>
                  <ChevronRight size={20} className="card-chevron" />
                </Link>
                <Link to="/compte/favoris" className="account-card premium-card">
                  <div className="card-icon-wrapper"><Heart size={24} /></div>
                  <div className="card-info">
                    <h3>Mes Favoris</h3>
                    <p>{wishlistItems.length > 0 ? `${wishlistItems.length} produit${wishlistItems.length > 1 ? 's' : ''} sauvegardé${wishlistItems.length > 1 ? 's' : ''}` : 'Aucun favori pour l\'instant'}</p>
                  </div>
                  <ChevronRight size={20} className="card-chevron" />
                </Link>
                <Link to="/compte/fidelite" className="account-card premium-card">
                  <div className="card-icon-wrapper"><Gift size={24} /></div>
                  <div className="card-info">
                    <h3>Fidélité &amp; Portefeuille</h3>
                    <p>{user.profile?.loyalty_points ? `${user.profile.loyalty_points} points cumulés` : 'Consulter vos points et bons d\'achat'}</p>
                  </div>
                  <ChevronRight size={20} className="card-chevron" />
                </Link>
                <Link to="/compte/parametres" className="account-card premium-card">
                  <div className="card-icon-wrapper"><Settings size={24} /></div>
                  <div className="card-info"><h3>Paramètres</h3><p>Modifier vos informations personnelles</p></div>
                  <ChevronRight size={20} className="card-chevron" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    )
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await login(loginForm.username, loginForm.password)
    if (res.success) navigate('/compte')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (registerForm.password !== registerForm.password2) {
      alert('Les mots de passe ne correspondent pas.')
      return
    }
    const res = await register(registerForm)
    if (res.success) navigate('/compte')
  }

  const handleRegisterB2B = async (e) => {
    e.preventDefault()
    if (b2bForm.password !== b2bForm.password2) {
      alert('Les mots de passe ne correspondent pas.')
      return
    }
    if (!b2bForm.nrc_file) {
      alert('Veuillez fournir une copie de votre registre de commerce.')
      return
    }

    const formData = new FormData()
    Object.keys(b2bForm).forEach(key => {
      if (b2bForm[key] !== null) {
        formData.append(key, b2bForm[key])
      }
    })

    const res = await registerB2B(formData)
    if (res.success) {
      alert(res.message || 'Demande B2B envoyée avec succès.')
      navigate('/compte')
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const res = await socialLoginAction('google', credentialResponse.credential)
    if (res.success) navigate('/compte')
  }

  const handleFacebookCallback = async (response) => {
    if (response.accessToken) {
      const res = await socialLoginAction('facebook', response.accessToken)
      if (res.success) navigate('/compte')
    }
  }

  const SocialButtons = () => (
    <div className="social-auth" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>Ou continuer avec</div>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert('Échec de la connexion Google')}
            useOneTap
          />
        </div>
      </GoogleOAuthProvider>
      {/* FacebookLogin removed temporarily for debugging React 19 compatibility */}
    </div>
  )

  return (
    <main className="account-page page-enter" style={{ paddingTop: '120px' }}>

      {/* Tabs */}
      <div className="auth-tabs-row">
        <button
          className={`auth-tab-pill ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
          id="tab-login"
        >Connexion</button>
        <button
          className={`auth-tab-pill ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
          id="tab-register"
        >Inscription Client</button>
        {/* B2B tab hidden for now */}
        <button
          className={`auth-tab-pill ${activeTab === 'b2b' ? 'active' : ''}`}
          onClick={() => setActiveTab('b2b')}
          id="tab-b2b"
          style={{ display: 'none' }}
        >Inscription B2B</button>
      </div>

      {error && <div className="auth-error container" style={{ maxWidth: 520, margin: '0 auto 16px' }}>{error}</div>}

      {/* LOGIN */}
      {activeTab === 'login' && (
        <div className="container auth-single-wrap">
          <form className="auth-form-card" onSubmit={handleLogin} id="form-login">
            <div className="form-group">
              <label className="form-label" htmlFor="login_username">Nom d'utilisateur ou Email</label>
              <input className="form-input" id="login_username" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login_password">Mot de passe</label>
              <input className="form-input" type="password" id="login_password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-black auth-submit" disabled={isLoading} id="btn-login">
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
            {SocialButtons()}
          </form>
        </div>
      )}

      {/* INSCRIPTION CLIENT (B2C) */}
      {activeTab === 'register' && (
        <div className="container auth-single-wrap">
          <form className="auth-form-card" onSubmit={handleRegister} id="form-register">
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">Prénom *</label>
                  <input className="form-input" id="first_name" value={registerForm.first_name} onChange={(e) => setRegisterForm({...registerForm, first_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="last_name">Nom *</label>
                  <input className="form-input" id="last_name" value={registerForm.last_name} onChange={(e) => setRegisterForm({...registerForm, last_name: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="username">Nom d'utilisateur *</label>
                <input className="form-input" id="username" value={registerForm.username} onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})} required />
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email *</label>
                  <input className="form-input" type="email" id="email" value={registerForm.email} onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Téléphone *</label>
                  <input className="form-input" id="phone" value={registerForm.phone} onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})} required />
                </div>
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Mot de passe *</label>
                  <input className="form-input" type="password" id="password" value={registerForm.password} onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password2">Confirmer *</label>
                  <input className="form-input" type="password" id="password2" value={registerForm.password2} onChange={(e) => setRegisterForm({...registerForm, password2: e.target.value})} required />
                </div>
              </div>
              <button type="submit" className="btn btn-black auth-submit" disabled={isLoading} id="btn-register">
                {isLoading ? 'Inscription...' : "S'inscrire"}
              </button>
              {SocialButtons()}
            </form>
        </div>
      )}

      {/* INSCRIPTION B2B */}
      {activeTab === 'b2b' && (
        <div className="container auth-single-wrap">
          <form className="auth-form-card" onSubmit={handleRegisterB2B} id="form-b2b">
              <div className="form-group">
                <label className="form-label" htmlFor="company_name">Nom de l'entreprise *</label>
                <input className="form-input" id="company_name" value={b2bForm.company_name} onChange={(e) => setB2bForm({...b2bForm, company_name: e.target.value})} required />
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="nrc">Registre de Commerce (RC)</label>
                  <input className="form-input" id="nrc" value={b2bForm.nrc} onChange={(e) => setB2bForm({...b2bForm, nrc: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="nif">NIF *</label>
                  <input className="form-input" id="nif" value={b2bForm.nif} onChange={(e) => setB2bForm({...b2bForm, nif: e.target.value})} required />
                </div>
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_first_name">Prénom *</label>
                  <input className="form-input" id="b2b_first_name" value={b2bForm.first_name} onChange={(e) => setB2bForm({...b2bForm, first_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_last_name">Nom *</label>
                  <input className="form-input" id="b2b_last_name" value={b2bForm.last_name} onChange={(e) => setB2bForm({...b2bForm, last_name: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="b2b_username">Nom d'utilisateur *</label>
                <input className="form-input" id="b2b_username" value={b2bForm.username} onChange={(e) => setB2bForm({...b2bForm, username: e.target.value})} required />
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_email">Email *</label>
                  <input className="form-input" type="email" id="b2b_email" value={b2bForm.email} onChange={(e) => setB2bForm({...b2bForm, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_phone">Téléphone *</label>
                  <input className="form-input" id="b2b_phone" value={b2bForm.phone} onChange={(e) => setB2bForm({...b2bForm, phone: e.target.value})} required />
                </div>
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_password">Mot de passe *</label>
                  <input className="form-input" type="password" id="b2b_password" value={b2bForm.password} onChange={(e) => setB2bForm({...b2bForm, password: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="b2b_password2">Confirmer *</label>
                  <input className="form-input" type="password" id="b2b_password2" value={b2bForm.password2} onChange={(e) => setB2bForm({...b2bForm, password2: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="b2b_nrc_file">Copie du Registre de Commerce (Image/PDF) *</label>
                <input className="form-input" type="file" id="b2b_nrc_file" accept=".pdf,image/*" onChange={(e) => setB2bForm({...b2bForm, nrc_file: e.target.files[0]})} required style={{ padding: '9px 12px' }} />
              </div>
              <button type="submit" className="btn btn-black auth-submit" disabled={isLoading} id="btn-register-b2b">
                {isLoading ? 'Envoi...' : "Demander un compte Pro"}
              </button>
            </form>
        </div>
      )}
    </main>
  )
}
