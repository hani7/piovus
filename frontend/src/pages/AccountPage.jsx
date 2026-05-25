import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './AccountPage.css'

export default function AccountPage() {
  const { user, login, register, isLoading, error, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '', phone: '', password: '', password2: ''
  })

  if (user) {
    return (
      <main className="account-page page-enter container">
        <div className="account-dashboard">
          <div className="account-dashboard__header">
            <div className="account-avatar">{user.first_name?.charAt(0) || user.username?.charAt(0)}</div>
            <div>
              <h1>Bonjour, {user.first_name || user.username} !</h1>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="account-dashboard__cards">
            <Link to="/compte/commandes" className="account-card" id="account-orders">
              <h3>Mes Commandes</h3>
              <p>Voir l'historique et le suivi</p>
            </Link>
            <div className="account-card" onClick={logout} style={{cursor:'pointer'}} id="account-logout">
              <h3>Déconnexion</h3>
              <p>Se déconnecter de l'appareil</p>
            </div>
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

  return (
    <main className="account-page page-enter container">
      <div className="auth-container">
        <div className="auth-tabs">
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)} id="tab-login">Connexion</button>
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)} id="tab-register">Inscription</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {isLogin ? (
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
          </form>
        ) : (
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
          </form>
        )}
      </div>
    </main>
  )
}
