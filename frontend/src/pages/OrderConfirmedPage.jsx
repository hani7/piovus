import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import PageSEO from '../components/PageSEO'

export default function OrderConfirmedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Données passées via navigate state depuis CheckoutPage
  const state = location.state || {}
  const orderId   = state.orderId
  const total     = state.total     || 0
  const items     = state.items     || []
  const method    = state.method    || 'cash' // 'cash' | 'cib'

  // Rediriger si on arrive sans orderId (accès direct à l'URL)
  useEffect(() => {
    if (!orderId) {
      navigate('/', { replace: true })
    }
  }, [orderId, navigate])

  // ── Meta Pixel Purchase (cash) ─────────────────────────────────────────────
  // Pour CIB, le Purchase est déjà déclenché dans PaymentResultPage
  useEffect(() => {
    if (!orderId || method === 'cib') return

    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        value: total,
        currency: 'DZD',
        content_ids: items.map(i => String(i.product?.id || i.id || '')),
        content_type: 'product',
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        order_id: String(orderId),
      })
    }
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        value: total,
        currency: 'DZD',
        contents: items.map(i => ({
          content_id: String(i.product?.id || i.id || ''),
          content_name: i.product?.name || i.name || '',
          quantity: i.quantity,
          price: i.price,
        })),
        order_id: String(orderId),
      })
    }
    // Google Analytics (si présent)
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: String(orderId),
        value: total,
        currency: 'DZD',
        items: items.map(i => ({
          item_id: String(i.product?.id || i.id || ''),
          item_name: i.product?.name || i.name || '',
          quantity: i.quantity,
          price: i.price,
        })),
      })
    }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!orderId) return null

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream, #faf9f7)' }}>
      <PageSEO
        title="Commande confirmée — Piové Cosmetics"
        description="Votre commande a bien été enregistrée. Merci pour votre achat !"
        url="/order-confirmed"
      />

      <div style={{
        textAlign: 'center',
        maxWidth: 480,
        padding: '48px 32px',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        margin: '24px auto',
      }}>
        {/* Icône succès animée */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9485b, #e8718a)',
          color: '#fff',
          fontSize: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 4px 20px rgba(201,72,91,0.35)',
          animation: 'pop 0.4s ease',
        }}>✓</div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111', marginBottom: 12 }}>
          Commande confirmée !
        </h1>

        <div style={{
          background: '#f9fafb',
          borderRadius: 12,
          padding: '16px 20px',
          margin: '20px 0',
          border: '1px solid #f3f4f6',
        }}>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 4 }}>Numéro de commande</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent, #c9485b)', letterSpacing: '0.5px' }}>
            #{orderId}
          </p>
        </div>

        <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: 8, fontSize: '0.95rem' }}>
          Votre commande a bien été enregistrée.
        </p>
        <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 28, fontSize: '0.88rem' }}>
          Notre équipe vous contactera pour confirmer la livraison.
        </p>

        {/* Résumé articles */}
        {items.length > 0 && (
          <div style={{ textAlign: 'left', borderTop: '1px solid #f3f4f6', paddingTop: 16, marginBottom: 24 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.5px' }}>
              Récapitulatif
            </p>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: 6 }}>
                <span>{item.product?.name || item.name} × {item.quantity}</span>
                <span style={{ fontWeight: 600 }}>{(item.price * item.quantity).toLocaleString('fr-DZ')} DA</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: '#111', borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 10 }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-accent, #c9485b)' }}>{Number(total).toLocaleString('fr-DZ')} DA</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-outline" id="confirmed-home" style={{ borderRadius: 50, padding: '10px 24px' }}>
            Retour à l'accueil
          </Link>
          {user && (
            <Link to="/compte/commandes" className="btn btn-accent" id="confirmed-orders" style={{ borderRadius: 50, padding: '10px 24px' }}>
              Mes commandes
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0 }
          70%  { transform: scale(1.1) }
          100% { transform: scale(1);   opacity: 1 }
        }
      `}</style>
    </main>
  )
}
