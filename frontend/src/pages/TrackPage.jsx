import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageSEO from '../components/PageSEO'
import client from '../api/client'
import './TrackPage.css'

const STATUS_ICONS = {
  pending:   '🕐',
  confirmed: '✅',
  shipped:   '🚚',
  fulfilled: '📦',
  cancelled: '❌',
  returned:  '↩️',
}

const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#3b82f6',
  shipped:   '#8b5cf6',
  fulfilled: '#10b981',
  cancelled: '#ef4444',
  returned:  '#6b7280',
}

export default function TrackPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setOrders(null)
    try {
      const res = await client.get(`/track/?q=${encodeURIComponent(query.trim())}`)
      setOrders(res.data.orders || [])
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Aucune commande trouvée avec ces informations. Vérifiez votre numéro de commande, téléphone ou email.')
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="track-page page-enter">
      <PageSEO
        title="Suivre ma commande — Piové Cosmetics"
        description="Suivez votre commande Piové Cosmetics en temps réel. Entrez votre numéro de commande, téléphone ou email."
        url="/suivi"
      />

      {/* Hero */}
      <div className="track-hero">
        <div className="track-hero__inner container">
          <span className="track-hero__icon">🚚</span>
          <h1 className="track-hero__title">Suivre ma commande</h1>
          <p className="track-hero__sub">
            Entrez votre numéro de commande, numéro de téléphone ou adresse email
          </p>

          <form className="track-form" onSubmit={handleSearch}>
            <div className="track-form__row">
              <input
                id="track-input"
                className="track-form__input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: 1234 / 0550123456 / email@example.com"
                autoComplete="off"
                aria-label="Numéro de commande, téléphone ou email"
              />
              <button
                type="submit"
                className="track-form__btn"
                disabled={loading || !query.trim()}
                id="track-submit"
              >
                {loading ? (
                  <span className="track-spinner" />
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    Rechercher
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container track-results">

        {error && (
          <div className="track-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="track-empty">
            <div className="track-empty__icon">📭</div>
            <p>Aucune commande trouvée.</p>
            <Link to="/shop" className="btn btn-accent">Continuer mes achats</Link>
          </div>
        )}

        {orders && orders.map((order) => (
          <div key={order.id} className="track-card">
            {/* Card header */}
            <div className="track-card__header">
              <div>
                <span className="track-card__num">Commande #{order.id}</span>
                <span className="track-card__date">{order.created_at}</span>
              </div>
              <div
                className="track-card__badge"
                style={{ background: STATUS_COLORS[order.status] || '#6b7280' }}
              >
                {STATUS_ICONS[order.status] || '📦'} {order.status_label}
              </div>
            </div>

            {/* Order info */}
            <div className="track-card__body">
              <div className="track-info-grid">
                <div className="track-info-item">
                  <span className="track-info-label">Paiement</span>
                  <span className="track-info-value">{order.payment_method}</span>
                </div>
                <div className="track-info-item">
                  <span className="track-info-label">Wilaya</span>
                  <span className="track-info-value">{order.wilaya || '—'}</span>
                </div>
                <div className="track-info-item">
                  <span className="track-info-label">Livraison</span>
                  <span className="track-info-value">{order.delivery_type} {order.delivery_company ? `(${order.delivery_company})` : ''}</span>
                </div>
                <div className="track-info-item">
                  <span className="track-info-label">Total</span>
                  <span className="track-info-value track-info-value--accent">{order.total.toLocaleString('fr-DZ')} DA</span>
                </div>
              </div>

              {/* Items */}
              <div className="track-items">
                <p className="track-items__label">Articles commandés</p>
                {order.items.map((item, idx) => (
                  <div key={idx} className="track-item">
                    <span className="track-item__name">{item.name}{item.variant ? ` — ${item.variant}` : ''}</span>
                    <span className="track-item__qty">x{item.quantity}</span>
                    <span className="track-item__price">{(item.price * item.quantity).toLocaleString('fr-DZ')} DA</span>
                  </div>
                ))}
              </div>

              {/* Mylerz tracking */}
              {order.mylerz_barcode && (
                <div className="track-mylerz">
                  <div className="track-mylerz__header">
                    <span className="track-mylerz__label">🔍 Suivi Mylerz</span>
                    <span className="track-mylerz__barcode">{order.mylerz_barcode}</span>
                  </div>

                  {order.mylerz_status && (
                    <div className="track-mylerz__current">
                      Statut actuel : <strong>{order.mylerz_status}</strong>
                    </div>
                  )}

                  {order.tracking_events && order.tracking_events.length > 0 ? (
                    <div className="track-timeline">
                      {order.tracking_events.map((ev, i) => (
                        <div key={i} className={`track-timeline__item ${i === 0 ? 'track-timeline__item--active' : ''}`}>
                          <div className="track-timeline__dot" />
                          <div className="track-timeline__content">
                            <div className="track-timeline__status">{ev.status || ev.description}</div>
                            {ev.description && ev.description !== ev.status && (
                              <div className="track-timeline__desc">{ev.description}</div>
                            )}
                            <div className="track-timeline__meta">
                              {ev.date && <span>{ev.date}</span>}
                              {ev.location && <span> · {ev.location}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="track-mylerz__no-events">
                      Aucun événement de suivi disponible pour le moment.
                    </p>
                  )}
                </div>
              )}

              {!order.mylerz_barcode && (
                <div className="track-no-ship">
                  📋 Votre commande est en cours de traitement. Le suivi sera disponible une fois expédiée.
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Help */}
        {!loading && (
          <div className="track-help">
            <p>Besoin d'aide ? Contactez-nous sur <strong>Instagram</strong> ou par <strong>WhatsApp</strong>.</p>
          </div>
        )}
      </div>
    </main>
  )
}
