import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'
import './admin.css'

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminClient.post('/auth/login/', form)
      
      if (res.data.mfa_required) {
        setMfaStep(true)
        setUserId(res.data.user_id)
        setLoading(false)
        return
      }

      const { user, access, refresh } = res.data
      if (!user.is_staff && !user.is_superuser) {
        setError('AccÃ¨s refusÃ©. Compte administrateur requis.')
        setLoading(false)
        return
      }
      localStorage.setItem('admin_access_token', access)
      localStorage.setItem('admin_refresh_token', refresh)
      localStorage.setItem('admin_user', JSON.stringify(user))
      navigate('/piove-secure-2026')
    } catch {
      setError('Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminClient.post('/auth/verify-otp/', { user_id: userId, otp })
      const { user, access, refresh } = res.data
      
      localStorage.setItem('admin_access_token', access)
      localStorage.setItem('admin_refresh_token', refresh)
      localStorage.setItem('admin_user', JSON.stringify(user))
      navigate('/piove-secure-2026')
    } catch {
      setError('Code OTP invalide ou expirÃ©.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <h1>PIOVÃ‰</h1>
          <p>Panneau d'administration</p>
        </div>

        {error && <div className="admin-error-msg">{error}</div>}

        {!mfaStep ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom d'utilisateur</label>
              <input
                id="admin-username"
                className="form-control"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                id="admin-password"
                className="form-control"
                type="password"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <button
              id="admin-login-btn"
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--admin-text-muted)' }}>
              Un code de sÃ©curitÃ© (OTP) a Ã©tÃ© envoyÃ© Ã  votre adresse e-mail. Veuillez le saisir ci-dessous.
            </div>
            <div className="form-group">
              <label>Code de sÃ©curitÃ© (OTP)</label>
              <input
                id="admin-otp"
                className="form-control"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
                maxLength={6}
                style={{ letterSpacing: 4, textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'VÃ©rification...' : 'Valider'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, color: 'var(--admin-text-muted)' }}
              onClick={() => setMfaStep(false)}
            >
              Annuler
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

