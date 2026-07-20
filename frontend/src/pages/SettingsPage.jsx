import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import { Settings, Save, Lock } from 'lucide-react'

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }
const cardStyle = { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-200)' }
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (user) {
      setProfileForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '' })
    }
  }, [user])

  if (!user) return null

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true); setProfileError(''); setProfileSuccess(false)
    try {
      const res = await client.patch('/auth/profile/', profileForm)
      setUser({ ...user, ...res.data })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err.response?.data?.error || "Erreur lors de la mise à jour.")
    } finally { setProfileLoading(false) }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Les mots de passe ne correspondent pas."); return
    }
    setPasswordLoading(true); setPasswordError(''); setPasswordSuccess(false)
    try {
      await client.post('/auth/password/change/', passwordForm)
      setPasswordSuccess(true)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Erreur lors du changement.")
    } finally { setPasswordLoading(false) }
  }

  return (
    <div className="page-enter" style={{ paddingBottom: 32 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', fontWeight: 600, marginBottom: 24 }}>
        <Settings size={24} /> Paramètres
      </h1>

      {/* Stacked layout — works on all screens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Informations personnelles */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600 }}>Informations personnelles</h2>
          {profileError && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>{profileError}</div>}
          {profileSuccess && <div style={{ background: '#D1FAE5', color: '#047857', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>Profil mis à jour ✓</div>}
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Prénom</label>
                <input style={inputStyle} type="text" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input style={inputStyle} type="text" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
            </div>
            <button type="submit" disabled={profileLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: '8px', background: 'var(--color-black)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer', opacity: profileLoading ? 0.7 : 1 }}>
              <Save size={18} /> {profileLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>

        {/* Sécurité */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600 }}>Changer le mot de passe</h2>
          {passwordError && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>{passwordError}</div>}
          {passwordSuccess && <div style={{ background: '#D1FAE5', color: '#047857', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>Mot de passe modifié ✓</div>}
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Mot de passe actuel</label>
              <input style={inputStyle} type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>Nouveau mot de passe</label>
              <input style={inputStyle} type="password" required minLength={6} value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
              <input style={inputStyle} type="password" required minLength={6} value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} />
            </div>
            <button type="submit" disabled={passwordLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: '8px', background: 'var(--color-gray-100)', color: 'var(--color-gray-800)', fontSize: '0.95rem', fontWeight: 600, border: '1px solid var(--color-gray-300)', cursor: passwordLoading ? 'not-allowed' : 'pointer', opacity: passwordLoading ? 0.7 : 1 }}>
              <Lock size={18} /> {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
