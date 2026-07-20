import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Gift, Copy, CheckCircle } from 'lucide-react'
import './AccountPage.css'

export default function LoyaltyPage() {
  const { user, refreshUser } = useAuthStore()
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    refreshUser()
  }, [])

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
    <div className="page-enter">
      <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Gift size={26} color="var(--color-accent)" /> Fidélité &amp; Portefeuille
      </h1>

      {/* Points card */}
      <div className="premium-card" style={{ padding: 24, borderRadius: 16, marginBottom: 24, flexDirection: 'column', alignItems: 'stretch' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600 }}>Vos points de fidélité</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>
            {points}
          </div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: '0.85rem', lineHeight: 1.4 }}>
            Points actuels<br />(1 DA = 1 Point)
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'var(--color-gray-100)', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-accent), #2ecc71)',
            width: `${progressPercent}%`,
            transition: 'width 1s ease-in-out'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-gray-500)', marginBottom: 16 }}>
          <span>{points} pts</span>
          <span>Objectif: 5 000 pts</span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', lineHeight: 1.5, background: 'var(--color-gray-50)', padding: '12px 16px', borderRadius: 10 }}>
          À chaque fois que vous atteignez <strong>5 000 points</strong>, un coupon de <strong>-10%</strong> est automatiquement généré pour votre prochain achat !
        </p>
      </div>

      {/* Coupons */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Vos bons d'achat</h3>
      {coupons.length === 0 ? (
        <div style={{ padding: 24, background: 'var(--color-gray-50)', border: '1px dashed var(--color-gray-300)', borderRadius: 12, textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
          Aucun bon d'achat disponible pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {coupons.filter(c => c.is_active).map(coupon => (
            <div key={coupon.id} style={{
              background: '#fff', border: '1px solid var(--color-accent)', borderRadius: 12,
              padding: 16, boxShadow: '0 4px 12px rgba(46,204,113,0.1)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--color-accent)' }} />
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Remise fidélité</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: 12 }}>-10%</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'var(--color-gray-100)', padding: '10px 14px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'break-all' }}>
                  {coupon.code}
                </div>
                <button onClick={() => handleCopy(coupon.code)} style={{
                  background: copiedCode === coupon.code ? 'var(--color-accent)' : 'var(--color-black)',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {copiedCode === coupon.code ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
