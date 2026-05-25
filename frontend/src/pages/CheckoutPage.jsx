import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { createOrder } from '../api/orders'
import { useAuthStore } from '../store/authStore'
import './CheckoutPage.css'

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane',
]

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [errors, setErrors] = useState({})

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  const [form, setForm] = useState({
    guest_name: user ? `${user.first_name} ${user.last_name}`.trim() : '',
    guest_phone: user?.profile?.phone || '',
    guest_email: user?.email || '',
    shipping_address: user?.profile?.address || '',
    wilaya: user?.profile?.wilaya || '',
    city: '',
    notes: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const errs = {}
    if (!form.guest_name.trim()) errs.guest_name = 'Champ obligatoire'
    if (!form.guest_phone.trim()) errs.guest_phone = 'Champ obligatoire'
    if (!form.shipping_address.trim()) errs.shipping_address = 'Champ obligatoire'
    if (!form.wilaya) errs.wilaya = 'Champ obligatoire'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        ...form,
        items: items.map((i) => ({
          product_id: i.product.id,
          variant_id: i.variant?.id || null,
          quantity: i.quantity,
        })),
      }
      const res = await createOrder(payload)
      setOrderId(res.data.id)
      clearCart()
      setSuccess(true)
    } catch (err) {
      setErrors({ submit: 'Une erreur est survenue. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && !success) {
    return (
      <div className="checkout-empty container">
        <p>Votre panier est vide.</p>
        <Link to="/shop" className="btn btn-accent" id="checkout-empty-shop">Continuer mes achats</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="checkout-success container page-enter">
        <div className="checkout-success__icon">✓</div>
        <h1>Commande confirmée !</h1>
        <p>Votre commande <strong>#{orderId}</strong> a bien été enregistrée.</p>
        <p>Notre équipe vous contactera pour confirmer la livraison.</p>
        <div className="checkout-success__actions">
          <Link to="/" className="btn btn-outline" id="success-home">Retour à l'accueil</Link>
          {user && <Link to="/compte/commandes" className="btn btn-accent" id="success-orders">Voir mes commandes</Link>}
        </div>
      </div>
    )
  }

  return (
    <main className="checkout-page page-enter">
      <div className="container checkout-page__layout">
        {/* ── Form ─────────────────────────────────── */}
        <div className="checkout-form-wrap">
          <h1 className="checkout-page__title">Finaliser la commande</h1>
          <form onSubmit={handleSubmit} className="checkout-form" id="checkout-form">

            <div className="checkout-section">
              <h3>Informations de livraison</h3>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_name">Nom complet *</label>
                  <input className={`form-input ${errors.guest_name ? 'error' : ''}`} id="guest_name" name="guest_name" value={form.guest_name} onChange={handleChange} placeholder="Votre nom complet" />
                  {errors.guest_name && <span className="field-error">{errors.guest_name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_phone">Téléphone *</label>
                  <input className={`form-input ${errors.guest_phone ? 'error' : ''}`} id="guest_phone" name="guest_phone" value={form.guest_phone} onChange={handleChange} placeholder="0550 000 000" />
                  {errors.guest_phone && <span className="field-error">{errors.guest_phone}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="guest_email">Email (optionnel)</label>
                <input className="form-input" id="guest_email" name="guest_email" type="email" value={form.guest_email} onChange={handleChange} placeholder="email@exemple.com" />
              </div>
            </div>

            <div className="checkout-section">
              <h3>Adresse de livraison</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="shipping_address">Adresse *</label>
                <input className={`form-input ${errors.shipping_address ? 'error' : ''}`} id="shipping_address" name="shipping_address" value={form.shipping_address} onChange={handleChange} placeholder="N° rue, quartier..." />
                {errors.shipping_address && <span className="field-error">{errors.shipping_address}</span>}
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="wilaya">Wilaya *</label>
                  <select className={`form-input ${errors.wilaya ? 'error' : ''}`} id="wilaya" name="wilaya" value={form.wilaya} onChange={handleChange}>
                    <option value="">-- Choisir une wilaya --</option>
                    {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {errors.wilaya && <span className="field-error">{errors.wilaya}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="city">Commune</label>
                  <input className="form-input" id="city" name="city" value={form.city} onChange={handleChange} placeholder="Votre commune" />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h3>Notes de commande</h3>
              <textarea className="form-input" id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Instructions spéciales pour la livraison..." style={{resize:'vertical'}} />
            </div>

            {errors.submit && <p className="field-error" style={{marginBottom:'16px'}}>{errors.submit}</p>}

            <div className="checkout-payment-notice">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <div>
                <p className="payment-label">Mode de paiement</p>
                <p className="payment-value">Paiement à la livraison (Cash on delivery)</p>
              </div>
            </div>

            <button type="submit" className="btn btn-accent checkout-submit-btn" disabled={loading} id="submit-order-btn">
              {loading ? 'Traitement...' : `Confirmer la commande — ${total.toLocaleString('fr-DZ')} DA`}
            </button>
          </form>
        </div>

        {/* ── Order Summary ──────────────────────── */}
        <aside className="checkout-summary">
          <h3 className="checkout-summary__title">Récapitulatif</h3>
          <div className="checkout-summary__items">
            {items.map((i) => (
              <div key={i.key} className="checkout-summary__item">
                <div className="checkout-summary__item-img">
                  {i.product.thumbnail
                    ? <img src={i.product.thumbnail} alt={i.product.name} />
                    : <div className="checkout-summary__item-placeholder" />}
                  <span className="checkout-summary__qty">{i.quantity}</span>
                </div>
                <div className="checkout-summary__item-info">
                  <p className="checkout-summary__item-name">{i.product.name}</p>
                  {i.variant && <p className="checkout-summary__item-variant">{i.variant.name}</p>}
                </div>
                <p className="checkout-summary__item-price">{(i.price * i.quantity).toLocaleString('fr-DZ')} DA</p>
              </div>
            ))}
          </div>
          <div className="checkout-summary__totals">
            <div className="checkout-summary__row">
              <span>Sous-total</span>
              <span>{total.toLocaleString('fr-DZ')} DA</span>
            </div>
            <div className="checkout-summary__row">
              <span>Livraison</span>
              <span className="checkout-summary__shipping">Calculée à la commande</span>
            </div>
            <div className="checkout-summary__row checkout-summary__row--total">
              <span>Total estimé</span>
              <span>{total.toLocaleString('fr-DZ')} DA</span>
            </div>
          </div>
          <Link to="/cart" className="checkout-summary__edit" id="edit-cart-link">Modifier le panier</Link>
        </aside>
      </div>
    </main>
  )
}
