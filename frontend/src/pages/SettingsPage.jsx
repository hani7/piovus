import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import { Settings, Save, ArrowLeft, Lock } from 'lucide-react'
import './OrdersPage.css'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      })
    }
  }, [user])

  if (!user) return null

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess(false)

    try {
      const res = await client.patch('/auth/profile/', profileForm)
      const updatedUser = { ...user, ...res.data }
      setUser(updatedUser)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err.response?.data?.error || "Erreur lors de la mise à jour du profil.")
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.")
      return
    }

    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess(false)

    try {
      await client.post('/auth/password/change/', passwordForm)
      setPasswordSuccess(true)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Erreur lors du changement de mot de passe.")
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="orders-page page-enter">
      <div className="orders-header">
        <h1 className="orders-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} /> Paramètres
        </h1>
        <Link to="/compte" className="btn btn-outline" id="orders-back-btn">
          <ArrowLeft size={16} style={{ marginRight: 8 }} /> Retour au compte
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', margin: '40px auto 0', maxWidth: '1000px', alignItems: 'start' }}>
        
        {/* Personal Info Section */}
        <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-200)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontWeight: 600 }}>Informations personnelles</h2>
          
          {profileError && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>{profileError}</div>}
          {profileSuccess && <div style={{ background: '#D1FAE5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>Profil mis à jour avec succès.</div>}

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Prénom</label>
                <input 
                  type="text" 
                  value={profileForm.first_name}
                  onChange={e => setProfileForm({...profileForm, first_name: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Nom</label>
                <input 
                  type="text" 
                  value={profileForm.last_name}
                  onChange={e => setProfileForm({...profileForm, last_name: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Adresse Email</label>
              <input 
                type="email" 
                value={profileForm.email}
                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={profileLoading}
              style={{ 
                marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', borderRadius: '8px', background: 'var(--color-black)', color: '#fff', 
                fontSize: '1rem', fontWeight: 600, border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer', opacity: profileLoading ? 0.7 : 1 
              }}
            >
              <Save size={20} />
              {profileLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>

        {/* Security Section */}
        <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-200)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontWeight: 600 }}>Sécurité</h2>
          
          {passwordError && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>{passwordError}</div>}
          {passwordSuccess && <div style={{ background: '#D1FAE5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>Mot de passe modifié avec succès.</div>}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Mot de passe actuel</label>
              <input 
                type="password" 
                required
                value={passwordForm.current_password}
                onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Nouveau mot de passe</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>Confirmer le nouveau mot de passe</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={passwordLoading}
              style={{ 
                marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', borderRadius: '8px', background: 'var(--color-gray-100)', color: 'var(--color-gray-800)', 
                fontSize: '1rem', fontWeight: 600, border: '1px solid var(--color-gray-300)', cursor: passwordLoading ? 'not-allowed' : 'pointer', opacity: passwordLoading ? 0.7 : 1 
              }}
            >
              <Lock size={20} />
              {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
