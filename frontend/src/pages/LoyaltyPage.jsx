import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Gift, Copy, CheckCircle } from 'lucide-react'
import './AccountPage.css' // We can reuse styles

export default function LoyaltyPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/compte')
    }
  }, [user, navigate])

  if (!user) return null

  const profile = user.profile || {}
  const points = profile.loyalty_points || 0
  const coupons = user.coupons || []
  
  const progressPercent = Math.min((points / 5000) * 100, 100)

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <main className="page-enter container" style={{ paddingTop: '120px', minHeight: '80vh' }}>
      <div className="orders-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Gift size={28} color="var(--color-accent)" /> 
          Fidélité & Portefeuille
        </h1>
        <Link to="/compte" className="btn btn-outline">Retour au compte</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 32, alignItems: 'start' }}>
        {/* Points & Progress */}
        <div className="premium-card" style={{ padding: 32, borderRadius: 16 }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            Vos points de fidélité
          </h2>
          
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>
              {points}
            </div>
            <div style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem', marginTop: 8 }}>
              Points actuels (1 DA = 1 Point)
            </div>
          </div>

          <div style={{ background: 'var(--color-gray-100)', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            <div 
              style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--color-accent), #2ecc71)', 
                width: `${progressPercent}%`,
                transition: 'width 1s ease-in-out'
              }} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', color: 'var(--color-gray-600)', fontWeight: 600 }}>
            <span>Objectif: 5000 Points</span>
          </div>

          <p style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--color-gray-600)', lineHeight: 1.5, textAlign: 'center' }}>
            À chaque fois que vous atteignez 5000 points, un <strong>coupon de -10%</strong> est automatiquement généré pour votre prochain achat !
          </p>
        </div>

        {/* Coupons Wallet */}
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Vos bons d'achat</h3>
          
          {coupons.length === 0 ? (
            <div style={{ padding: 24, background: 'var(--color-gray-50)', border: '1px dashed var(--color-gray-300)', borderRadius: 12, textAlign: 'center', color: 'var(--color-gray-500)' }}>
              Aucun bon d'achat disponible pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {coupons.filter(c => c.is_active).map(coupon => (
                <div key={coupon.id} style={{ 
                  background: '#fff', 
                  border: '1px solid var(--color-accent)', 
                  borderRadius: 12, 
                  padding: 20, 
                  boxShadow: '0 4px 12px rgba(46, 204, 113, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--color-accent)' }} />
                  
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>
                    Remise fidélité
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: 16 }}>
                    -10%
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: 'var(--color-gray-100)', padding: '10px 16px', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {coupon.code}
                    </div>
                    <button 
                      onClick={() => handleCopy(coupon.code)}
                      style={{ 
                        background: copiedCode === coupon.code ? 'var(--color-accent)' : 'var(--color-black)', 
                        color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' 
                      }}
                      title="Copier le code"
                    >
                      {copiedCode === coupon.code ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
