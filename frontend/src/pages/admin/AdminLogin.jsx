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
  const [showPass, setShowPass] = useState(false)
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
        setError('Accès refusé. Compte administrateur requis.')
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
      setError('Code OTP invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── LEFT PANEL: Brand ── */}
      <div style={{
        flex: 1,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Logo + tagline */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="Piové"
            style={{ height: 90, objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 24 }}
          />
          <p style={{
            marginTop: 4, fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>Administration</p>

          {/* Separator line */}
          <div style={{
            width: 60, height: 2, margin: '20px auto',
            background: '#cc0000',
            borderRadius: 2,
          }} />

          <p style={{
            fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)',
            maxWidth: 280, lineHeight: 1.6,
          }}>
            Espace sécurisé réservé aux administrateurs Piové Cosmetics.
          </p>
        </div>

        {/* Bottom badge */}
        <div style={{
          position: 'absolute', bottom: 28,
          fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.1em',
        }}>
          © {new Date().getFullYear()} Piové Cosmetics — Accès restreint
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div style={{
        width: '42%',
        minWidth: 380,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 56px',
        position: 'relative',
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: '#cc0000',
        }} />

        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Title */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f0f0f', margin: 0 }}>
              Connexion
            </h2>
            <p style={{ marginTop: 6, color: '#94a3b8', fontSize: '0.9rem' }}>
              Entrez vos identifiants pour accéder au panel
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', padding: '10px 14px', borderRadius: '50px',
              fontSize: '0.875rem', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          {!mfaStep ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nom d'utilisateur
                </label>
                <input
                  id="admin-username"
                  type="text"
                  placeholder="ex: lotfi"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '0.95rem',
                    border: '1.5px solid #e2e8f0', borderRadius: '50px',
                    outline: 'none', boxSizing: 'border-box',
                    background: '#f8fafc', color: '#0f172a',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#cc0000'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '12px 44px 12px 14px', fontSize: '0.95rem',
                      border: '1.5px solid #e2e8f0', borderRadius: '50px',
                      outline: 'none', boxSizing: 'border-box',
                      background: '#f8fafc', color: '#0f172a',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#cc0000'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      fontSize: '1rem', padding: 0,
                    }}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="admin-login-btn"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8, padding: '13px', width: '100%',
                  background: loading ? '#ff4d4d' : '#cc0000',
                  color: '#fff', border: 'none', borderRadius: '50px',
                  fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s', letterSpacing: '0.03em',
                  boxShadow: '0 4px 14px rgba(204,0,0,0.35)',
                }}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
                Un code de sécurité a été envoyé à votre e-mail. Saisissez-le ci-dessous.
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Code OTP
                </label>
                <input
                  id="admin-otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  style={{
                    width: '100%', padding: '14px', fontSize: '1.4rem',
                    letterSpacing: 12, textAlign: 'center', fontWeight: 700,
                    border: '1.5px solid #e2e8f0', borderRadius: '50px',
                    outline: 'none', boxSizing: 'border-box', background: '#f8fafc',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                style={{
                  padding: '13px', width: '100%',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff', border: 'none', borderRadius: '50px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(168,85,247,0.35)',
                }}
              >
                {loading ? 'Vérification...' : 'Valider le code'}
              </button>
              <button
                type="button"
                onClick={() => setMfaStep(false)}
                style={{
                  padding: '11px', width: '100%', background: 'none',
                  color: '#94a3b8', border: '1.5px solid #e2e8f0', borderRadius: '50px',
                  fontSize: '0.9rem', cursor: 'pointer',
                }}
              >
                ← Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

