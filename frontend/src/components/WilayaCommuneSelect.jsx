/**
 * WilayaCommuneSelect — Sélecteur wilaya + commune lié pour l'Algérie
 *
 * Props :
 *   wilaya      — valeur wilaya sélectionnée
 *   city        — valeur commune sélectionnée
 *   onChange    — function(name, value) appelée à chaque changement
 *   errors      — { wilaya?: string, city?: string }
 *   required    — bool (wilaya obligatoire)
 *   className   — classe CSS optionnelle sur le wrapper
 */
import { useState, useEffect, useMemo } from 'react'

// Chargement lazy des données JSON (une seule fois en mémoire)
let _wilayas = null
let _communes = null

async function loadData() {
  if (_wilayas && _communes) return { wilayas: _wilayas, communes: _communes }
  const [wRes, cRes] = await Promise.all([
    fetch('/wilayas.json'),
    fetch('/communes.json'),
  ])
  _wilayas  = await wRes.json()
  _communes = await cRes.json()
  return { wilayas: _wilayas, communes: _communes }
}

export default function WilayaCommuneSelect({
  wilaya,
  city,
  onChange,
  errors = {},
  required = false,
  className = '',
}) {
  const [wilayas,  setWilayas]  = useState([])
  const [communes, setCommunes] = useState([])

  useEffect(() => {
    loadData().then(({ wilayas: w, communes: c }) => {
      setWilayas(w)
      setCommunes(c)
    })
  }, [])

  // Trouver l'ID de la wilaya sélectionnée
  const selectedWilayaObj = useMemo(
    () => wilayas.find(w => w.name === wilaya),
    [wilayas, wilaya]
  )

  // Filtrer les communes de la wilaya choisie
  const filteredCommunes = useMemo(() => {
    if (!selectedWilayaObj) return []
    return communes
      .filter(c => String(c.wilaya_id) === String(selectedWilayaObj.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [communes, selectedWilayaObj])

  const handleWilaya = (e) => {
    onChange('wilaya', e.target.value)
    onChange('city', '') // reset commune quand wilaya change
  }

  const handleCity = (e) => {
    onChange('city', e.target.value)
  }

  return (
    <div className={`wilaya-commune-select ${className}`} style={{ display: 'contents' }}>
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
          onChange={handleWilaya}
        >
          <option value="">-- Choisir une wilaya --</option>
          {wilayas.map((w) => (
            <option key={w.id} value={w.name}>
              {w.code ? `${w.code}. ` : ''}{w.name}
            </option>
          ))}
        </select>
        {errors.wilaya && <span className="field-error">{errors.wilaya}</span>}
      </div>

      {/* Commune */}
      <div className="form-group">
        <label className="form-label" htmlFor="city">Commune</label>
        {filteredCommunes.length > 0 ? (
          <select
            className="form-input"
            id="city"
            name="city"
            value={city}
            onChange={handleCity}
            disabled={!wilaya}
          >
            <option value="">-- Choisir une commune --</option>
            {filteredCommunes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input
            className="form-input"
            id="city"
            name="city"
            value={city}
            onChange={handleCity}
            placeholder={wilaya ? 'Votre commune' : 'Choisissez d\'abord une wilaya'}
            disabled={!wilaya}
          />
        )}
        {errors.city && <span className="field-error">{errors.city}</span>}
      </div>
    </div>
  )
}
