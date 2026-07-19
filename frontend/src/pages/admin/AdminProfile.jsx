import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'
import { User, Mail, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminProfile() {
  const navigate = useNavigate()
  const storedUser = JSON.parse(localStorage.getItem('admin_user') || 'null')
  
  const [profileForm, setProfileForm] = useState({
    first_name: storedUser?.first_name || '',
    last_name: storedUser?.last_name || '',
    email: storedUser?.email || '',
  })
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [profileMsg, setProfileMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: '0.9rem',
    border: '1.5px solid var(--admin-border)', borderRadius: 10,
    outline: 'none', boxSizing: 'border-box',
    background: 'var(--admin-surface2)', color: 'var(--admin-text)',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--admin-text-muted)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)
    try {
      const res = await adminClient.put('/admin/profile/', profileForm)
      // Update localStorage
      const updated = { ...storedUser, ...res.data }
      localStorage.setItem('admin_user', JSON.stringify(updated))
      setProfileMsg({ type: 'success', text: 'Profil mis à jour avec succès !' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la mise à jour.' })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdMsg(null)
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdMsg({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' })
      return
    }
    if (pwdForm.new_password.length < 8) {
      setPwdMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    setPwdLoading(true)
    try {
      await adminClient.post('/admin/profile/change-password/', {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      })
      setPwdMsg({ type: 'success', text: 'Mot de passe changé avec succès !' })
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.detail || 'Mot de passe actuel incorrect.' })
    } finally {
      setPwdLoading(false)
    }
  }

  const initials = ((profileForm.first_name?.[0] || '') + (profileForm.last_name?.[0] || storedUser?.username?.[0] || '')).toUpperCase() || 'A'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
            Mon Profil
          </h2>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            @{storedUser?.username} {storedUser?.is_superuser ? '· Superadmin' : storedUser?.groups?.includes('marketing') ? '· Marketing' : '· Staff'}
          </p>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} /> Informations personnelles
          </span>
        </div>
        <div style={{ padding: '24px 20px' }}>
          {profileMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              borderRadius: 8, marginBottom: 20, fontSize: '0.875rem',
              background: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: profileMsg.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {profileMsg.text}
            </div>
          )}
          <form onSubmit={handleProfileSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Prénom</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Votre prénom"
                  onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Votre nom"
                  onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Adresse e-mail
                </span>
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                style={inputStyle}
                placeholder="votre@email.com"
                onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Nom d'utilisateur</label>
              <input
                type="text"
                value={storedUser?.username || ''}
                disabled
                style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 4 }}>
                Le nom d'utilisateur ne peut pas être modifié.
              </p>
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Save size={16} />
              {profileLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} /> Changer le mot de passe
          </span>
        </div>
        <div style={{ padding: '24px 20px' }}>
          {pwdMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              borderRadius: 8, marginBottom: 20, fontSize: '0.875rem',
              background: pwdMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${pwdMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: pwdMsg.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              {pwdMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {pwdMsg.text}
            </div>
          )}
          <form onSubmit={handlePasswordChange}>
            {[
              { label: 'Mot de passe actuel', key: 'current_password', show: showCurrent, setShow: setShowCurrent },
              { label: 'Nouveau mot de passe', key: 'new_password', show: showNew, setShow: setShowNew },
              { label: 'Confirmer le nouveau mot de passe', key: 'confirm_password', show: showConfirm, setShow: setShowConfirm },
            ].map(({ label, key, show, setShow }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwdForm[key]}
                    onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    placeholder="••••••••"
                    required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--admin-text-muted)', padding: 0, display: 'flex',
                    }}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ background: 'var(--admin-surface2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: 0 }}>
                Le mot de passe doit contenir au moins 8 caractères.
              </p>
            </div>
            <button
              type="submit"
              disabled={pwdLoading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Lock size={16} />
              {pwdLoading ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
