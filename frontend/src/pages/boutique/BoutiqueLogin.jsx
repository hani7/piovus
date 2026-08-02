import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ArrowRight, Lock } from 'lucide-react'
import boutiqueClient from '../../api/boutiqueClient'

export default function BoutiqueLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // If already logged in, redirect
    if (localStorage.getItem('boutique_access_token')) {
      navigate('/boutique')
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await boutiqueClient.post('/boutique/login/', { username, password })
      localStorage.setItem('boutique_access_token', res.data.access)
      localStorage.setItem('boutique_refresh_token', res.data.refresh)
      localStorage.setItem('boutique_user', JSON.stringify(res.data.user))
      localStorage.setItem('boutique_info', JSON.stringify(res.data.boutique))
      window.location.href = '/boutique'
    } catch (err) {
      setError(err.response?.data?.detail || 'Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ background: '#fdf2f8', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#be123c' }}>
            <Store size={30} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Espace Boutique</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 5 }}>Connectez-vous pour gérer vos retraits</p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Nom d'utilisateur</label>
            <input 
              type="text" 
              required 
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Saisissez votre identifiant"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                required 
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '12px', borderRadius: '8px', background: '#be123c', color: '#fff', 
              border: 'none', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
