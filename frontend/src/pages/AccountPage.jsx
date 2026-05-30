import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { LayoutDashboard, Package, MapPin, Settings, LogOut, ChevronRight } from 'lucide-react'
import './AccountPage.css'

const GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID_PLACEHOLDER"
const FACEBOOK_APP_ID = "FACEBOOK_APP_ID_PLACEHOLDER"

export default function AccountPage() {
  const { user, login, register, registerB2B, socialLoginAction, isLoading, error, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login') // 'login', 'register', 'b2b'

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '', phone: '', password: '', password2: ''
  })
  const [b2bForm, setB2bForm] = useState({
    company_name: '', nrc: '', nif: '', first_name: '', last_name: '', username: '', email: '', phone: '', password: '', password2: '', nrc_file: null
  })

  if (user) {
    return (
      <main className="account-page page-enter container" style={{ paddingTop: '120px' }}>
        <div className="account-dashboard-wrapper">
          {/* Sidebar */}
          <aside className="account-sidebar">
            <div className="account-sidebar__profile">
              <div className="account-avatar-large">
                {user.first_name?.charAt(0) || user.username?.charAt(0)}
              </div>
              <h3>{user.first_name || user.username}</h3>
              <p>{user.email}</p>
            </div>
            <nav className="account-sidebar__nav">
              <Link to="/compte" className="account-nav-item active">
                <LayoutDashboard size={20} /> Tableau de bord
              </Link>
              <Link to="/compte/commandes" className="account-nav-item">
                <Package size={20} /> Mes Commandes
              </Link>
              <Link to="/compte/adresses" className="account-nav-item">
                <MapPin size={20} /> Mes Adresses
              </Link>
              <Link to="/compte/parametres" className="account-nav-item">
                <Settings size={20} /> Paramètres
              </Link>
              <button className="account-nav-item text-danger" onClick={logout}>
                <LogOut size={20} /> Déconnexion
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <section className="account-content">
            <div className="account-welcome-banner glassmorphism">
              <div className="banner-text">
                <h1>Bienvenue dans votre espace, {user.first_name || user.username}</h1>
                <p>Gérez vos commandes, vos adresses et vos préférences depuis ce tableau de bord sécurisé.</p>
              </div>
            </div>

            <h2 className="section-title">Aperçu de votre compte</h2>
            <div className="account-dashboard__cards">
              <Link to="/compte/commandes" className="account-card premium-card" id="account-orders">
                <div className="card-icon-wrapper"><Package size={24} /></div>
                <div className="card-info">
                  <h3>Mes Commandes</h3>
                  <p>Consulter l'historique et suivre la livraison</p>
                </div>
                <ChevronRight size={20} className="card-chevron" />
              </Link>
              
              <Link to="/compte/adresses" className="account-card premium-card">
                <div className="card-icon-wrapper"><MapPin size={24} /></div>
                <div className="card-info">
                  <h3>Mes Adresses</h3>
                  <p>Gérer vos adresses de livraison et facturation</p>
                </div>
                <ChevronRight size={20} className="card-chevron" />
              </Link>

              <Link to="/compte/parametres" className="account-card premium-card">
                <div className="card-icon-wrapper"><Settings size={24} /></div>
                <div className="card-info">
                  <h3>Paramètres</h3>
                  <p>Modifier vos informations personnelles et mot de passe</p>
                </div>
                <ChevronRight size={20} className="card-chevron" />
              </Link>
            </div>
          </section>
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
    <main className="account-page page-enter container" style={{ paddingTop: '120px' }}>
      <div className="auth-container">
        <div className="auth-tabs">
          <button className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')} id="tab-login">Connexion</button>
          <button className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')} id="tab-register">Inscription</button>
          <button className={`auth-tab ${activeTab === 'b2b' ? 'active' : ''}`} onClick={() => setActiveTab('b2b')} id="tab-b2b">Professionnel (B2B)</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin} id="form-login">
            <div className="form-group">
              <label className="form-label" htmlFor="login_username">Nom d'utilisateur</label>
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
        )}

        {activeTab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister} id="form-register">
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
        )}

        {activeTab === 'b2b' && (
          <form className="auth-form" onSubmit={handleRegisterB2B} id="form-b2b">
            <div className="form-group">
              <label className="form-label" htmlFor="company_name">Nom de l'entreprise *</label>
              <input className="form-input" id="company_name" value={b2bForm.company_name} onChange={(e) => setB2bForm({...b2bForm, company_name: e.target.value})} required />
            </div>
            <div className="checkout-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="nrc">Registre de Commerce (RC) *</label>
                <input className="form-input" id="nrc" value={b2bForm.nrc} onChange={(e) => setB2bForm({...b2bForm, nrc: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="nif">NIF *</label>
                <input className="form-input" id="nif" value={b2bForm.nif} onChange={(e) => setB2bForm({...b2bForm, nif: e.target.value})} required />
              </div>
            </div>
            
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginTop: '20px', marginBottom: '15px' }}>Contact</h3>
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
        )}
      </div>
    </main>
  )
}
