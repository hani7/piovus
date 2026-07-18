import { useState, useEffect } from 'react'
import client from '../api/client'
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
  'Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Béni Abbès','In Salah',
  'In Guezzam','Touggourt','Djanet','El M\'Ghair','El Meniaa'
]

export default function CheckoutPage() {
  const { items, clearCart, coupon } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [errors, setErrors] = useState({})

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      
      // Success chime (two notes: C6 -> E6)
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime) // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.15) // E6
      
      osc.start(ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5)
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.warn("Audio not supported", e)
    }
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const isB2B = user?.profile?.is_b2b || false
  const totalWeight = items.reduce((s, i) => s + (i.weight || 0) * i.quantity, 0)

  const [form, setForm] = useState({
    guest_first_name: user?.first_name || '',
    guest_last_name: user?.last_name || '',
    guest_phone: user?.profile?.phone || '',
    guest_email: user?.email || '',
    shipping_address: user?.profile?.address || '',
    wilaya: user?.profile?.wilaya || '',
    city: '',
    notes: '',
    delivery_company_id: '',
    delivery_type: 'home', // always home delivery
    payment_method: 'cash',
  })

  const [companies, setCompanies] = useState([])
  const [deliveryCost, setDeliveryCost] = useState(0)

  useEffect(() => {
    client.get('/delivery-companies/').then(res => {
      // only keep active ones
      setCompanies(res.data.filter(c => c.is_active))
    }).catch(console.error)
  }, [])

  // Auto-select and compute delivery cost when wilaya or companies change
  useEffect(() => {
    if (!form.wilaya || companies.length === 0) {
      setDeliveryCost(0)
      return
    }

    // Find available companies for this wilaya
    const available = companies.filter(c => c.rates.some(r => r.wilaya_name === form.wilaya))
    
    let currentCompany = available.find(c => c.id === Number(form.delivery_company_id))
    
    // If current selected company is not available, pick the first one
    if (!currentCompany && available.length > 0) {
      currentCompany = available[0]
      setForm(f => ({ ...f, delivery_company_id: currentCompany.id }))
    } else if (available.length === 0) {
      setForm(f => ({ ...f, delivery_company_id: '' }))
      setDeliveryCost(0)
      return
    }

    // Find rate
    const rate = currentCompany?.rates.find(r => r.wilaya_name === form.wilaya)
    if (rate) {
      let baseHome = isB2B ? Number(rate.b2b_price_home || rate.price_home) : Number(rate.price_home)
      let baseDesk = isB2B ? Number(rate.b2b_price_desk || rate.price_desk) : Number(rate.price_desk)
      
      let surcharge = 0
      if (isB2B && totalWeight > 5) {
        surcharge = Math.ceil(totalWeight - 5) * 50
      }
      
      setDeliveryCost(form.delivery_type === 'desk' ? (baseDesk + surcharge) : (baseHome + surcharge))
    } else {
      setDeliveryCost(0)
    }

  }, [form.wilaya, form.delivery_company_id, form.delivery_type, companies])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const errs = {}
    if (!form.guest_first_name.trim()) errs.guest_first_name = 'Champ obligatoire'
    if (!form.guest_last_name.trim()) errs.guest_last_name = 'Champ obligatoire'
    if (!form.guest_phone.trim()) errs.guest_phone = 'Champ obligatoire'
    if (!form.wilaya) errs.wilaya = 'Champ obligatoire'
    if (!form.delivery_company_id) errs.delivery = 'Veuillez sélectionner un transporteur'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { 
      setErrors(errs); 
      alert("Veuillez remplir tous les champs obligatoires (en rouge) avant de continuer.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        guest_name: `${form.guest_first_name.trim()} ${form.guest_last_name.trim()}`.trim(),
        delivery_company_id: form.delivery_company_id ? Number(form.delivery_company_id) : null,
        items: items.map((i) => ({
          product_id: i.product.id,
          variant_id: i.variant?.id || null,
          quantity: i.quantity,
        })),
        coupon_id: coupon ? coupon.id : null,
        discount_amount: coupon ? coupon.discount_amount : 0,
      }
      const res = await createOrder(payload)
      clearCart()
      if (res.data.satim_payment_url) {
        // CIB/Edahabia — redirect to SATIM payment page
        localStorage.setItem('lastOrder', JSON.stringify(res.data))
        window.location.href = res.data.satim_payment_url
      } else if (res.data.satim_error) {
        window.location.href = `/payment-result?status=fail&reason=init_failed&msg=${encodeURIComponent(res.data.satim_error)}`
      } else {
        setOrderId(res.data.id)
        setSuccess(true)
        playSuccessSound()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || JSON.stringify(err?.response?.data)
      setErrors({ submit: serverMsg || 'Une erreur est survenue. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }


  if (items.length === 0 && !success) {
    return (
      <div className="checkout-empty container page-enter">
        <p>Votre panier est vide.</p>
        <Link to="/shop" className="btn btn-accent" id="checkout-empty-shop">Continuer mes achats</Link>
      </div>
    )
  }

  if (success) {
    return (
      <main className="checkout-page page-enter">
        <div className="container">
          <div className="checkout-success">
            <div className="checkout-success__icon">✓</div>
            <h1>Commande confirmée !</h1>
            <p>Votre commande <strong>#{orderId}</strong> a bien été enregistrée.</p>
            <p>Notre équipe vous contactera pour confirmer la livraison.</p>
            <div className="checkout-success__actions">
              <Link to="/" className="btn btn-outline" id="success-home">Retour à l'accueil</Link>
              {user && <Link to="/compte/commandes" className="btn btn-accent" id="success-orders">Voir mes commandes</Link>}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout-page page-enter">
      <div className="container">
        <div className="checkout-page__layout">
        {/* ── Form ─────────────────────────────────── */}
        <div className="checkout-form-wrap">
          <h1 className="checkout-page__title">Finaliser la commande</h1>
          <form onSubmit={handleSubmit} className="checkout-form" id="checkout-form">

            <div className="checkout-section">
              <h3>Informations de livraison</h3>
              {/* Row 1: Prénom + Nom */}
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_first_name">Prénom *</label>
                  <input className={`form-input ${errors.guest_first_name ? 'error' : ''}`} id="guest_first_name" name="guest_first_name" value={form.guest_first_name} onChange={handleChange} placeholder="Prénom" />
                  {errors.guest_first_name && <span className="field-error">{errors.guest_first_name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_last_name">Nom *</label>
                  <input className={`form-input ${errors.guest_last_name ? 'error' : ''}`} id="guest_last_name" name="guest_last_name" value={form.guest_last_name} onChange={handleChange} placeholder="Nom de famille" />
                  {errors.guest_last_name && <span className="field-error">{errors.guest_last_name}</span>}
                </div>
              </div>
              {/* Row 2: Téléphone + Email */}
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_phone">Téléphone *</label>
                  <input className={`form-input ${errors.guest_phone ? 'error' : ''}`} id="guest_phone" name="guest_phone" value={form.guest_phone} onChange={handleChange} placeholder="0550 000 000" />
                  {errors.guest_phone && <span className="field-error">{errors.guest_phone}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="guest_email">Email (optionnel)</label>
                  <input className="form-input" id="guest_email" name="guest_email" type="email" value={form.guest_email} onChange={handleChange} placeholder="email@exemple.com" />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h3>Adresse de livraison</h3>
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

            {/* Delivery Methods */}
            {form.wilaya && companies.length > 0 && (
              <div className="checkout-section">
                <h3>Mode de livraison</h3>
                {companies.filter(c => c.rates.some(r => r.wilaya_name === form.wilaya)).length === 0 ? (
                  <p className="field-error">Aucun transporteur disponible pour cette wilaya.</p>
                ) : (
                  <div className="delivery-options" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {companies.filter(c => c.rates.some(r => r.wilaya_name === form.wilaya)).map(c => {
                      const rate = c.rates.find(r => r.wilaya_name === form.wilaya)
                      return (
                        <div key={c.id} className={`delivery-card ${Number(form.delivery_company_id) === c.id ? 'active' : ''}`} style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
                            <input 
                              type="radio" 
                              name="delivery_company_id" 
                              value={c.id} 
                              checked={Number(form.delivery_company_id) === c.id}
                              onChange={handleChange}
                            />
                            {c.name}
                          </label>
                          
                          {Number(form.delivery_company_id) === c.id && (
                            <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(() => {
                                let baseHome = isB2B ? Number(rate.b2b_price_home || rate.price_home) : Number(rate.price_home)
                                let baseDesk = isB2B ? Number(rate.b2b_price_desk || rate.price_desk) : Number(rate.price_desk)
                                let surcharge = 0
                                if (isB2B && totalWeight > 5) {
                                  surcharge = Math.ceil(totalWeight - 5) * 50
                                }
                                return (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 500 }}>
                                      <span>À domicile</span>
                                      <strong>{baseHome + surcharge} DA</strong>
                                    </div>
                                    {isB2B && surcharge > 0 && (
                                      <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4 }}>
                                        * Inclus {surcharge} DA de supplément poids ({totalWeight.toFixed(2)} kg)
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {errors.delivery && <span className="field-error">{errors.delivery}</span>}
                  </div>
                )}
              </div>
            )}

            <div className="checkout-section">
              <h3>Mode de paiement</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontWeight: 600, border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="cash" 
                    checked={form.payment_method === 'cash'}
                    onChange={handleChange}
                  />
                  <div>
                    <div style={{ marginBottom: 4 }}>Paiement à la livraison</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontWeight: 400 }}>Payez en espèces à la réception de votre commande.</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontWeight: 600, border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="cib" 
                    checked={form.payment_method === 'cib'}
                    onChange={handleChange}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>CIB ou Edahabia</span>
                      <img src="/cib-edahabia.jpg" alt="CIB Edahabia" style={{ height: 24, objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontWeight: 400 }}>Paiement sécurisé en ligne (les frais de livraison seront réglés à la réception).</div>
                  </div>
                </label>
              </div>
            </div>

            {total < 1500 && (
              <div style={{ padding: '10px', background: 'rgba(255,0,0,0.1)', color: 'var(--admin-danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                Le montant minimum de commande est de 1 500 DA.<br/>
                Il vous manque {(1500 - total).toLocaleString('fr-DZ')} DA.
              </div>
            )}

            <button type="submit" className="btn btn-accent checkout-submit-btn" disabled={loading || total < 1500} id="submit-order-btn">
              {loading ? 'Traitement...' : `Confirmer la commande — ${form.payment_method === 'cib' ? (coupon ? coupon.new_total : total).toLocaleString('fr-DZ') : ((coupon ? coupon.new_total : total) + deliveryCost).toLocaleString('fr-DZ')} DA`}
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
            {coupon && (
              <div className="checkout-summary__row" style={{ color: 'var(--color-primary)' }}>
                <span>Code: {coupon.code}</span>
                <span>-{coupon.discount_amount.toLocaleString('fr-DZ')} DA</span>
              </div>
            )}
            <div className="checkout-summary__row">
              <span>Livraison {form.wilaya ? `(${form.wilaya})` : ''}</span>
              <span className="checkout-summary__shipping">{deliveryCost > 0 ? `${deliveryCost.toLocaleString('fr-DZ')} DA` : 'Calculée à la commande'}</span>
            </div>
            <div className="checkout-summary__row checkout-summary__row--total" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: form.payment_method === 'cib' ? 8 : 0 }}>
                <span>Total estimé {form.payment_method === 'cib' && '(en ligne)'}</span>
                <span>{form.payment_method === 'cib' ? (coupon ? coupon.new_total : total).toLocaleString('fr-DZ') : ((coupon ? coupon.new_total : total) + deliveryCost).toLocaleString('fr-DZ')} DA</span>
              </div>
              {form.payment_method === 'cib' && deliveryCost > 0 && (
                <div style={{ fontSize: '0.85rem', color: '#cc0000', fontWeight: 'bold', width: '100%', textAlign: 'right' }}>
                  + {deliveryCost.toLocaleString('fr-DZ')} DA à régler au livreur
                </div>
              )}
            </div>
          </div>
          <Link to="/cart" className="checkout-summary__edit" id="edit-cart-link">Modifier le panier</Link>
        </aside>
        </div>
      </div>
    </main>
  )
}
