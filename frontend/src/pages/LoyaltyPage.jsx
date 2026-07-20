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
    <div className="page-enter loyalty-page">
      <h1 className="loyalty-title">
        <Gift size={22} color="var(--color-accent)" /> Fidélité &amp; Portefeuille
      </h1>

      {/* Points card */}
      <div className="loyalty-card">
        <h2 className="loyalty-card__title">Vos points de fidélité</h2>

        <div className="loyalty-points-display">
          <span className="loyalty-points-number">{points}</span>
          <span className="loyalty-points-label">Points actuels<br />(1 DA = 1 Point)</span>
        </div>

        <div className="loyalty-progress-bar">
          <div className="loyalty-progress-bar__fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="loyalty-progress-labels">
          <span>{points} pts</span>
          <span>Objectif: 5 000 pts</span>
        </div>

        <p className="loyalty-info">
          À chaque fois que vous atteignez <strong>5 000 points</strong>, un coupon de{' '}
          <strong>-10%</strong> est automatiquement généré pour votre prochain achat !
        </p>
      </div>

      {/* Coupons */}
      <h3 className="loyalty-coupons-title">Vos bons d'achat</h3>

      {coupons.length === 0 ? (
        <div className="loyalty-empty">
          Aucun bon d'achat disponible pour le moment.
        </div>
      ) : (
        <div className="loyalty-coupon-list">
          {coupons.filter(c => c.is_active).map(coupon => (
            <div key={coupon.id} className="loyalty-coupon-card">
              <div className="loyalty-coupon-card__bar" />
              <div className="loyalty-coupon-card__label">Remise fidélité</div>
              <div className="loyalty-coupon-card__amount">-10%</div>
              <div className="loyalty-coupon-card__row">
                <div className="loyalty-coupon-card__code">{coupon.code}</div>
                <button
                  onClick={() => handleCopy(coupon.code)}
                  className={`loyalty-coupon-card__copy${copiedCode === coupon.code ? ' loyalty-coupon-card__copy--copied' : ''}`}
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
  )
}
