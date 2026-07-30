/**
 * WilayaCommuneSelect — Sélecteur wilaya + commune lié pour l'Algérie
 * Les données sont importées directement (bundlées) pour éviter les erreurs de fetch.
 */
import { useMemo } from 'react'
import wilayasData  from '../../public/wilayas.json'
import communesData from '../../public/communes.json'

export default function WilayaCommuneSelect({
  wilaya,
  city,
  onChange,
  errors = {},
  required = false,
}) {
  // Wilaya sélectionnée → trouver l'objet correspondant
  const selectedWilayaObj = useMemo(
    () => wilayasData.find(w => w.name === wilaya),
    [wilaya]
  )

  // Communes de la wilaya choisie, dédupliquées et triées alphabétiquement
  const filteredCommunes = useMemo(() => {
    if (!selectedWilayaObj) return []
    const seen = new Set()
    return communesData
      .filter(c => String(c.wilaya_id) === String(selectedWilayaObj.id))
      .filter(c => {
        const key = c.name.trim().toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [selectedWilayaObj])

  return (
    <>
      {/* Wilaya */}
      <div className="form-group">
        <label className="form-label" htmlFor="wilaya">
          Wilaya {required && <span style={{ color: 'var(--color-accent)' }}>*</span>}
        </label>
        <select
          className={`form-input ${errors.wilaya ? 'error' : ''}`}
          id="wilaya"
          name="wilaya"
          value={wilaya}
          onChange={e => {
            onChange('wilaya', e.target.value)
            onChange('city', '') // réinitialiser la commune quand la wilaya change
          }}
        >
          <option value="">-- Choisir une wilaya --</option>
          {wilayasData.map(w => (
            <option key={w.id} value={w.name}>
              {w.code}. {w.name}
            </option>
          ))}
        </select>
        {errors.wilaya && <span className="field-error">{errors.wilaya}</span>}
      </div>

      {/* Commune — dropdown si wilaya choisie, sinon input désactivé */}
      <div className="form-group">
        <label className="form-label" htmlFor="city">Commune</label>
        {wilaya && filteredCommunes.length > 0 ? (
          <select
            className="form-input"
            id="city"
            name="city"
            value={city}
            onChange={e => onChange('city', e.target.value)}
          >
            <option value="">-- Choisir une commune --</option>
            {filteredCommunes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input
            className="form-input"
            id="city"
            name="city"
            value={city}
            onChange={e => onChange('city', e.target.value)}
            placeholder={wilaya ? 'Votre commune' : "Choisissez d'abord une wilaya"}
            disabled={!wilaya}
            style={!wilaya ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          />
        )}
        {errors.city && <span className="field-error">{errors.city}</span>}
      </div>
    </>
  )
}
