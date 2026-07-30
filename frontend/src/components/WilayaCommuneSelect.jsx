/**
 * WilayaCommuneSelect
 * - Dropdown avec recherche intégrée pour wilaya et commune
 * - Les deux champs sont obligatoires
 * - Déduplications des communes automatiques
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import wilayasData  from '../../public/wilayas.json'
import communesData from '../../public/communes.json'

// ── Dropdown réutilisable avec recherche ────────────────────────────────────
function SearchDropdown({ id, value, options, placeholder, searchPlaceholder, onChange, disabled, error }) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const ref                 = useRef(null)
  const inputRef            = useRef(null)

  // Fermer si clic extérieur
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Focus sur l'input quand le dropdown s'ouvre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = useMemo(() =>
    query.trim()
      ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
      : options
  , [options, query])

  const display = options.find(o => o.value === value)?.label || ''

  const select = (val) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQuery('') } }}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          border: `1.5px solid ${error ? '#dc2626' : open ? 'var(--color-accent)' : 'var(--color-gray-300, #d1d5db)'}`,
          background: disabled ? '#f9fafb' : '#fff',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: value ? 'var(--color-black, #111)' : '#9ca3af',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
          textAlign: 'left',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {display || placeholder}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{
            flexShrink: 0, marginLeft: 8, color: '#9ca3af',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff',
          border: '1.5px solid var(--color-gray-200, #e5e7eb)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          zIndex: 9999,
          overflow: 'hidden',
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search input */}
          <div style={{
            padding: '8px 10px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder || 'Rechercher...'}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: '0.85rem', background: 'transparent',
                color: 'var(--color-black, #111)',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', display: 'flex' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Aucun résultat
              </div>
            ) : filtered.map(o => {
              const isSelected = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => select(o.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: 'none',
                    background: isSelected ? 'var(--color-accent, #c9485b)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--color-black, #111)',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.88rem', fontWeight: isSelected ? 600 : 400,
                    transition: 'background 0.12s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f3f4f6' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {o.prefix && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.6, minWidth: 22 }}>{o.prefix}</span>
                  )}
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function WilayaCommuneSelect({
  wilaya,
  city,
  onChange,
  errors = {},
}) {
  // Options wilayas
  const wilayaOptions = useMemo(() =>
    wilayasData.map(w => ({
      value: w.name,
      label: w.name,
      prefix: w.code,
    }))
  , [])

  // Wilaya sélectionnée
  const selectedWilaya = useMemo(
    () => wilayasData.find(w => w.name === wilaya),
    [wilaya]
  )

  // Options communes — filtrées + dédupliquées
  const communeOptions = useMemo(() => {
    if (!selectedWilaya) return []
    const seen = new Set()
    return communesData
      .filter(c => String(c.wilaya_id) === String(selectedWilaya.id))
      .filter(c => {
        const key = c.name.trim().toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map(c => ({ value: c.name, label: c.name }))
  }, [selectedWilaya])

  return (
    <>
      {/* ── Wilaya (obligatoire) ── */}
      <div className="form-group">
        <label className="form-label" htmlFor="wilaya">
          Wilaya <span style={{ color: 'var(--color-accent, #c9485b)' }}>*</span>
        </label>
        <SearchDropdown
          id="wilaya"
          value={wilaya}
          options={wilayaOptions}
          placeholder="-- Choisir une wilaya --"
          searchPlaceholder="Rechercher une wilaya..."
          onChange={val => {
            onChange('wilaya', val)
            onChange('city', '')   // reset commune
          }}
          error={!!errors.wilaya}
        />
        {errors.wilaya && <span className="field-error">{errors.wilaya}</span>}
      </div>

      {/* ── Commune (obligatoire) ── */}
      <div className="form-group">
        <label className="form-label" htmlFor="city">
          Commune <span style={{ color: 'var(--color-accent, #c9485b)' }}>*</span>
        </label>
        <SearchDropdown
          id="city"
          value={city}
          options={communeOptions}
          placeholder={wilaya ? '-- Choisir une commune --' : "Choisissez d'abord une wilaya"}
          searchPlaceholder="Rechercher une commune..."
          onChange={val => onChange('city', val)}
          disabled={!wilaya || communeOptions.length === 0}
          error={!!errors.city}
        />
        {errors.city && <span className="field-error">{errors.city}</span>}
      </div>
    </>
  )
}
