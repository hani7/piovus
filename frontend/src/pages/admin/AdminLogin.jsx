import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import './admin.css'

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await client.post('/auth/login/', form)
      const { user, access, refresh } = res.data
      if (!user.is_staff && !user.is_superuser) {
        setError('Accès refusé. Compte administrateur requis.')
        setLoading(false)
        return
      }
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('admin_user', JSON.stringify(user))
      navigate('/admin-panel')
    } catch {
      setError('Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <h1>PIOVÉ</h1>
          <p>Panneau d'administration</p>
        </div>

        {error && <div className="admin-error-msg">{error}</div>}

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
              placeholder="••••••••"
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
      </div>
    </div>
  )
}
