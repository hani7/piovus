import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Trash2 } from 'lucide-react'
import adminClient from '../../api/adminClient'
import './admin.css'

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran',
  'El Bayadh','Illizi','Bordj Bou Arreridj','Boumerdès','El Tarf','Tindouf',
  'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla',
  'Naâma','Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar',
  'Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet',
  'El M\'Ghair','El Meniaa'
]

export default function AdminOrderCreate({ isB2B = false }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  
  const [form, setForm] = useState({
    customer_id: null,
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    shipping_address: '',
    wilaya: '',
    city: '',
    delivery_company_id: '',
    delivery_type: 'home',
    payment_method: 'cash',
    discount_amount: 0
  })

  // Product & Cart State
  const [productsSearch, setProductsSearch] = useState('')
  const [productsResults, setProductsResults] = useState([])
  const [cart, setCart] = useState([]) // { product, variant, quantity }
  
  // Delivery State
  const [deliveryCompanies, setDeliveryCompanies] = useState([])
  const [deliveryCost, setDeliveryCost] = useState(0)

  useEffect(() => {
    adminClient.get('/admin/delivery-companies/').then(r => {
      setDeliveryCompanies(r.data.results || r.data)
    })
  }, [])

  // Debounced search for customers
  useEffect(() => {
    if (customerSearch.length > 2) {
      const timer = setTimeout(() => {
        adminClient.get(`/admin/customers/?search=${customerSearch}`).then(r => {
          setCustomerResults(r.data.results || r.data)
        })
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setCustomerResults([])
    }
  }, [customerSearch])

  // Debounced search for products
  useEffect(() => {
    if (productsSearch.length > 2) {
      const timer = setTimeout(() => {
        adminClient.get(`/admin/products/?search=${productsSearch}`).then(r => {
          setProductsResults(r.data.results || r.data)
        })
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setProductsResults([])
    }
  }, [productsSearch])

  const selectCustomer = (c) => {
    setForm({
      ...form,
      customer_id: c.id,
      guest_name: c.name || '',
      guest_phone: c.phone || '',
      guest_email: c.email || '',
    })
    setCustomerSearch('')
    setCustomerResults([])
  }

  const addToCart = (product) => {
    // If it has variants, we ideally need to prompt to select one, but for simplicity here we just pick the first one if present
    // Let's add it directly if no variants, otherwise show an alert
    if (product.variants && product.variants.length > 0) {
        const variant = product.variants[0]
        setCart([...cart, { product, variant, quantity: 1 }])
    } else {
        setCart([...cart, { product, variant: null, quantity: 1 }])
    }
  }

  const updateCartQty = (idx, delta) => {
    const newCart = [...cart]
    newCart[idx].quantity += delta
    if (newCart[idx].quantity <= 0) {
      newCart.splice(idx, 1)
    }
    setCart(newCart)
  }
  
  const removeCartItem = (idx) => {
    const newCart = [...cart]
    newCart.splice(idx, 1)
    setCart(newCart)
  }

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => {
    const p = item.product
    let price = p.effective_price
    if (isB2B) {
      price = p.b2b_price ? parseFloat(p.b2b_price) : (p.effective_price * (p.units_per_carton || 1))
    }
    return acc + (price * item.quantity)
  }, 0)

  useEffect(() => {
    // Fetch delivery cost
    if (form.delivery_company_id && form.wilaya) {
      adminClient.get('/admin/delivery-rates/').then(r => {
        const rates = r.data.results || r.data
        const rate = rates.find(rt => rt.company === parseInt(form.delivery_company_id) && rt.wilaya_name === form.wilaya)
        if (rate) {
          setDeliveryCost(form.delivery_type === 'desk' ? parseFloat(rate.price_desk) : parseFloat(rate.price_home))
        } else {
          setDeliveryCost(0)
        }
      })
    } else {
      setDeliveryCost(0)
    }
  }, [form.delivery_company_id, form.wilaya, form.delivery_type])

  const total = subtotal + deliveryCost - parseFloat(form.discount_amount || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return alert('Le panier est vide.')
    
    setSaving(true)
    try {
      const payload = {
        ...form,
        is_b2b: isB2B,
        items: cart.map(item => ({
          product_id: item.product.id,
          variant_id: item.variant ? item.variant.id : null,
          quantity: item.quantity
        }))
      }
      const res = await adminClient.post('/admin/orders/create_order/', payload)
      navigate(`/piove-secure-2026/orders/${res.data.id}`)
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la création de la commande : " + JSON.stringify(err.response?.data))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page" style={{ paddingBottom: 60 }}>
      <div className="admin-page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-icon" onClick={() => navigate(isB2B ? '/piove-secure-2026/orders-b2b' : '/piove-secure-2026/orders')}><ArrowLeft size={20}/></button>
          {isB2B ? 'Créer une Commande B2B' : 'Créer une Commande'}
        </h2>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Création...' : 'Valider la commande'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Client & Delivery Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Customer Selection */}
          <div className="admin-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Détails du Client</h3>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Rechercher un client existant</label>
              <div className="admin-search" style={{ margin: 0 }}>
                <Search size={16} />
                <input 
                  placeholder="Nom ou Numéro de téléphone..." 
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
              </div>
              {customerResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {customerResults.map(c => (
                    <div key={c.id} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => selectCustomer(c)}>
                      <strong>{c.name || 'Inconnu'}</strong> - {c.phone} {c.is_b2b ? <span className="badge badge-pending">B2B</span> : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nom complet *</label>
                <input required className="form-control" value={form.guest_name} onChange={e => setForm({...form, guest_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input required className="form-control" value={form.guest_phone} onChange={e => setForm({...form, guest_phone: e.target.value})} />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email (Optionnel)</label>
              <input type="email" className="form-control" value={form.guest_email} onChange={e => setForm({...form, guest_email: e.target.value})} />
            </div>
            
            {isB2B && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(240,184,106,0.15)', borderRadius: 8, color: 'var(--admin-warning)', fontSize: '0.85rem', fontWeight: 500 }}>
                ⚠️ Mode B2B Actif : Les prix affichés sont automatiquement calculés selon la grille de gros (prix au carton ou prix B2B spécifique).
              </div>
            )}
          </div>

          {/* Delivery Details */}
          <div className="admin-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Livraison</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Wilaya *</label>
                <select required className="form-control" value={form.wilaya} onChange={e => setForm({...form, wilaya: e.target.value})}>
                  <option value="">Sélectionner une wilaya</option>
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Commune *</label>
                <input required className="form-control" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label>Adresse complète *</label>
              <input required className="form-control" value={form.shipping_address} onChange={e => setForm({...form, shipping_address: e.target.value})} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Transporteur</label>
                <select className="form-control" value={form.delivery_company_id} onChange={e => setForm({...form, delivery_company_id: e.target.value})}>
                  <option value="">Aucun transporteur</option>
                  {deliveryCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type de livraison</label>
                <select className="form-control" value={form.delivery_type} onChange={e => setForm({...form, delivery_type: e.target.value})}>
                  <option value="home">À Domicile</option>
                  <option value="desk">Point Relais (Bureau)</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        {/* Right Column: Products & Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Products Search */}
          <div className="admin-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Ajouter des produits</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <div className="admin-search" style={{ margin: 0 }}>
                <Search size={16} />
                <input 
                  placeholder="Rechercher un produit..." 
                  value={productsSearch}
                  onChange={e => setProductsSearch(e.target.value)}
                />
              </div>
              {productsResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', zIndex: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {productsResults.map(p => (
                    <div key={p.id} style={{ padding: '10px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <img src={p.images?.[0]?.image || '/placeholder.png'} style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 4}} alt=""/>
                        <div>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{isB2B ? p.b2b_price || (p.effective_price * (p.units_per_carton||1)) : p.effective_price} DA</div>
                        </div>
                      </div>
                      <button className="btn-action-icon" onClick={() => {addToCart(p); setProductsSearch(''); setProductsResults([]);}}><Plus size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div style={{ marginTop: 24 }}>
              {cart.map((item, idx) => {
                const p = item.product
                let price = p.effective_price
                if (isB2B) price = p.b2b_price ? parseFloat(p.b2b_price) : (p.effective_price * (p.units_per_carton || 1))

                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <img src={p.images?.[0]?.image || '/placeholder.png'} style={{width: 50, height: 50, objectFit: 'cover', borderRadius: 6}} alt=""/>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.variants && p.variants.length > 0 && (
                          <select 
                            style={{ padding: '2px 4px', fontSize: '0.8rem', marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}
                            value={item.variant?.id || ''}
                            onChange={(e) => {
                              const newCart = [...cart]
                              newCart[idx].variant = p.variants.find(v => v.id === parseInt(e.target.value))
                              setCart(newCart)
                            }}
                          >
                            {p.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        )}
                        <div style={{ color: 'var(--admin-gold)', fontWeight: 600, marginTop: 4 }}>{price} DA</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: 4 }}>
                        <button type="button" style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => updateCartQty(idx, -1)}>-</button>
                        <span style={{ padding: '0 10px' }}>{item.quantity}</span>
                        <button type="button" style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => updateCartQty(idx, 1)}>+</button>
                      </div>
                      <button className="btn-icon" style={{ color: 'var(--admin-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => removeCartItem(idx)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {cart.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: '#888' }}>Aucun produit dans la commande.</div>}
            </div>
          </div>

          {/* Totals */}
          <div className="admin-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Résumé</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>Sous-total</span>
              <strong>{subtotal.toFixed(2)} DA</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>Frais de livraison</span>
              <strong>{deliveryCost.toFixed(2)} DA</strong>
            </div>
            
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Remise supplémentaire (DA)</label>
              <input type="number" className="form-control" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} />
            </div>

            <hr style={{ margin: '16px 0', borderColor: 'var(--admin-border)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
              <strong>Total</strong>
              <strong style={{ color: 'var(--admin-gold)' }}>{total.toFixed(2)} DA</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

