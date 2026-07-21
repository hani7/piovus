import { memo } from 'react'
import { Link } from 'react-router-dom'

/** ProductReviews — customer review cards */
const ProductReviews = memo(function ProductReviews({ reviews }) {
  if (!reviews?.length) return null
  return (
    <section className="product-reviews">
      <h2 className="product-section-title">Avis Clients</h2>
      <div className="reviews-grid">
        {reviews.map((r) => (
          <div key={r.id} className="review-card">
            <div className="review-card__header">
              <div className="review-card__avatar">
                {r.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="review-card__name">{r.username}</p>
                <div className="review-card__stars" aria-label={`Note : ${r.rating} sur 5`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= r.rating ? 'star star--filled' : 'star'} aria-hidden="true">★</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="review-card__comment">{r.comment}</p>
            <p className="review-card__date">
              <time dateTime={r.created_at}>
                {new Date(r.created_at).toLocaleDateString('fr-DZ')}
              </time>
            </p>
          </div>
        ))}
      </div>
    </section>
  )
})

/** ProductShare — share buttons row */
export const ProductShare = memo(function ProductShare({ product }) {
  const url = window.location.href
  return (
    <div className="product-info__share" role="group" aria-label="Partager ce produit">
      <button
        onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Découvrez ce produit : ' + product.name + ' - ' + url)}`, '_blank')}
        aria-label="Partager sur WhatsApp"
        title="WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      </button>
      <button
        onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(product.name)}`, '_blank')}
        aria-label="Partager sur Telegram"
        title="Telegram"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
      <button
        onClick={() => { navigator.clipboard.writeText(url); }}
        aria-label="Copier le lien"
        title="Copier le lien"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
    </div>
  )
})

export default ProductReviews
