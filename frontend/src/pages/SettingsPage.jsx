import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import { Settings, Save, Lock } from 'lucide-react'
import './AccountPage.css'

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
    <div className="page-enter settings-page">
      <h1 className="settings-title">
        <Settings size={22} /> Paramètres
      </h1>

      {/* Informations personnelles */}
      <div className="settings-card">
        <h2 className="settings-card__title">Informations personnelles</h2>
        {profileError && <div className="settings-alert settings-alert--error">{profileError}</div>}
        {profileSuccess && <div className="settings-alert settings-alert--success">Profil mis à jour ✓</div>}
        <form onSubmit={handleProfileSubmit} className="settings-form">
          <div className="settings-name-grid">
            <div>
              <label className="settings-label">Prénom</label>
              <input className="settings-input" type="text" value={profileForm.first_name}
                onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} />
            </div>
            <div>
              <label className="settings-label">Nom</label>
              <input className="settings-input" type="text" value={profileForm.last_name}
                onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="settings-label">Email</label>
            <input className="settings-input" type="email" value={profileForm.email}
              onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
          </div>
          <button type="submit" disabled={profileLoading}
            className={`settings-btn settings-btn--primary`}>
            <Save size={18} /> {profileLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div className="settings-card">
        <h2 className="settings-card__title">Changer le mot de passe</h2>
        {passwordError && <div className="settings-alert settings-alert--error">{passwordError}</div>}
        {passwordSuccess && <div className="settings-alert settings-alert--success">Mot de passe modifié ✓</div>}
        <form onSubmit={handlePasswordSubmit} className="settings-form">
          <div>
            <label className="settings-label">Mot de passe actuel</label>
            <input className="settings-input" type="password" required
              value={passwordForm.current_password}
              onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} />
          </div>
          <div>
            <label className="settings-label">Nouveau mot de passe</label>
            <input className="settings-input" type="password" required minLength={6}
              value={passwordForm.new_password}
              onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} />
          </div>
          <div>
            <label className="settings-label">Confirmer le nouveau mot de passe</label>
            <input className="settings-input" type="password" required minLength={6}
              value={passwordForm.confirm_password}
              onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} />
          </div>
          <button type="submit" disabled={passwordLoading}
            className="settings-btn settings-btn--secondary">
            <Lock size={18} /> {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
