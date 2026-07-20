import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import { MapPin, Save, ArrowLeft } from 'lucide-react'
import './OrdersPage.css' // We can reuse the OrdersPage layout style

export default function AddressesPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    address: '',
    wilaya: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.profile) {
      setForm({
        address: user.profile.address || '',
        wilaya: user.profile.wilaya || '',
        phone: user.profile.phone || ''
      })
    }
  }, [user])

  if (!user) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await client.patch('/auth/profile/', {
        profile: form
      })
      
      // Update local auth store user
      const updatedUser = { ...user, profile: res.data.profile }
      setUser(updatedUser)
      setSuccess(true)
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur s'est produite lors de la sauvegarde.")
    } finally {
      setLoading(false)
    }
  }

  const WILAYAS = [
    "1 - Adrar", "2 - Chlef", "3 - Laghouat", "4 - Oum El Bouaghi", "5 - Batna",
    "6 - Béjaïa", "7 - Biskra", "8 - Béchar", "9 - Blida", "10 - Bouira",
    "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
    "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
    "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
    "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
    "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
    "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
    "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
    "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
    "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt",
    "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
  ]

  return (
    <div className="orders-page page-enter">
      <div className="orders-header">
        <h1 className="orders-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MapPin size={28} /> Mes Adresses
        </h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '40px auto 0', background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-200)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontWeight: 600 }}>Adresse par défaut</h2>
        
        {error && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ background: '#D1FAE5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>Votre adresse a été mise à jour avec succès.</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>
              Numéro de téléphone
            </label>
            <input 
              type="text" 
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none' }}
              placeholder="Ex: 0550123456"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>
              Wilaya
            </label>
            <select 
              value={form.wilaya}
              onChange={e => setForm({...form, wilaya: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none', background: '#fff' }}
            >
              <option value="">Sélectionnez votre wilaya</option>
              {WILAYAS.map(w => (
                <option key={w} value={w.split(' - ')[1]}>{w}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-gray-700)' }}>
              Adresse de livraison complète
            </label>
            <textarea 
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-gray-300)', fontSize: '1rem', outline: 'none', minHeight: '100px', resize: 'vertical' }}
              placeholder="N° de rue, bâtiment, quartier..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', borderRadius: '8px', background: 'var(--color-black)', color: '#fff', 
              fontSize: '1rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 
            }}
          >
            <Save size={20} />
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  )
}
