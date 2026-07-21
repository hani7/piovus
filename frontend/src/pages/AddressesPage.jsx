import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import { MapPin, Save, Search, ChevronDown, X } from 'lucide-react'
import './OrdersPage.css'

const WILAYAS = [
  "1 - Adrar","2 - Chlef","3 - Laghouat","4 - Oum El Bouaghi","5 - Batna",
  "6 - Béjaïa","7 - Biskra","8 - Béchar","9 - Blida","10 - Bouira",
  "11 - Tamanrasset","12 - Tébessa","13 - Tlemcen","14 - Tiaret","15 - Tizi Ouzou",
  "16 - Alger","17 - Djelfa","18 - Jijel","19 - Sétif","20 - Saïda",
  "21 - Skikda","22 - Sidi Bel Abbès","23 - Annaba","24 - Guelma","25 - Constantine",
  "26 - Médéa","27 - Mostaganem","28 - M'Sila","29 - Mascara","30 - Ouargla",
  "31 - Oran","32 - El Bayadh","33 - Illizi","34 - Bordj Bou Arreridj","35 - Boumerdès",
  "36 - El Tarf","37 - Tindouf","38 - Tissemsilt","39 - El Oued","40 - Khenchela",
  "41 - Souk Ahras","42 - Tipaza","43 - Mila","44 - Aïn Defla","45 - Naâma",
  "46 - Aïn Témouchent","47 - Ghardaïa","48 - Relizane","49 - Timimoun","50 - Bordj Badji Mokhtar",
  "51 - Ouled Djellal","52 - Béni Abbès","53 - In Salah","54 - In Guezzam","55 - Touggourt",
  "56 - Djanet","57 - El M'Ghair","58 - El Meniaa"
]


function WilayaSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const filtered = WILAYAS.filter(w =>
    w.toLowerCase().includes(search.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const display = value
    ? WILAYAS.find(w => w.split(' - ')[1] === value) || value
    : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: '10px',
          border: `1.5px solid ${open ? 'var(--color-accent)' : 'var(--color-gray-300)'}`,
          background: '#fff', fontSize: '0.95rem', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          color: display ? 'var(--color-black)' : 'var(--color-gray-500)',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          {display || 'Sélectionnez votre wilaya'}
        </span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : '', transition: '0.2s', flexShrink: 0, color: 'var(--color-gray-500)' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid var(--color-gray-200)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000, overflow: 'hidden', maxHeight: '300px',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Search size={16} style={{ color: 'var(--color-gray-500)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher une wilaya..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem', background: 'transparent', color: 'var(--color-black)' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-gray-500)', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>Aucun résultat</div>
            ) : filtered.map(w => {
              const name = w.split(' - ')[1]
              const isSelected = value === name
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                  style={{
                    width: '100%', padding: '11px 16px', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10,
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--color-black)',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-gray-100)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-gray-500)', minWidth: 24 }}>{w.split(' - ')[0]}</span>
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--color-gray-300)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gray-700)' }

export default function AddressesPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ address: '', wilaya: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.profile) {
      setForm({ address: user.profile.address || '', wilaya: user.profile.wilaya || '', phone: user.profile.phone || '' })
    }
  }, [user])

  if (!user) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess(false)
    try {
      const res = await client.patch('/auth/profile/', { profile: form })
      setUser({ ...user, profile: res.data.profile })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur s'est produite.")
    } finally { setLoading(false) }
  }

  return (
    <div className="orders-page page-enter">
      <div className="orders-header">
        <h1 className="orders-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={22} /> Mes Adresses
        </h1>
      </div>

      <div style={{ background: '#fff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-200)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 600 }}>Adresse par défaut</h2>

        {error && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ background: '#D1FAE5', color: '#047857', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>Adresse mise à jour ✓</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Numéro de téléphone</label>
            <input style={inputStyle} type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Ex: 0550123456" />
          </div>

          <div>
            <label style={labelStyle}>Wilaya</label>
            <WilayaSelect value={form.wilaya} onChange={val => setForm({...form, wilaya: val})} />
          </div>

          <div>
            <label style={labelStyle}>Adresse de livraison complète</label>
            <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="N° de rue, bâtiment, quartier..." />
          </div>

          <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: '10px', background: 'var(--color-black)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            <Save size={18} /> {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  )
}
