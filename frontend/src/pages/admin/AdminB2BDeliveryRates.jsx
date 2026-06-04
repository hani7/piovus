import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import './admin.css'

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

export default function AdminB2BDeliveryRates() {
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRates(selectedCompanyId)
    } else {
      setRates([])
    }
  }, [selectedCompanyId])

  const fetchCompanies = async () => {
    try {
      const res = await adminClient.get('/delivery-companies/')
      setCompanies(res.data)
      if (res.data.length > 0) {
        setSelectedCompanyId(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRates = async (companyId) => {
    setLoading(true)
    try {
      const res = await adminClient.get(`/delivery-rates/?company=${companyId}`)
      const existingRates = res.data

      // Create a full grid with all 58 Wilayas
      const fullGrid = WILAYAS.map((wName, index) => {
        const exist = existingRates.find(r => r.wilaya_name === wName)
        if (exist) return exist
        return {
          id: null,
          company: companyId,
          wilaya_name: wName,
          b2b_price_home: 500, // default B2B
          b2b_price_desk: 300, // default B2B
        }
      })
      setRates(fullGrid)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePriceChange = (index, field, value) => {
    const newRates = [...rates]
    newRates[index][field] = value
    setRates(newRates)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save each rate sequentially
      for (const rate of rates) {
        const payload = {
          company: rate.company,
          wilaya_name: rate.wilaya_name,
          b2b_price_home: rate.b2b_price_home,
          b2b_price_desk: rate.b2b_price_desk
        }
        if (rate.id) {
          await adminClient.patch(`/delivery-rates/${rate.id}/`, payload)
        } else {
          // Si on crée la wilaya, il faut fournir les autres champs obligatoires
          payload.price_home = rate.price_home || 500
          payload.price_desk = rate.price_desk || 300
          const res = await adminClient.post('/delivery-rates/', payload)
          rate.id = res.data.id
        }
      }
      alert('Tarifs B2B enregistrés avec succès !')
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la sauvegarde de certains tarifs B2B.')
    } finally {
      setSaving(false)
    }
  }

  const applyToAll = (field, value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    if (!window.confirm(`Appliquer ${num} DA à toutes les wilayas pour ce champ ?`)) return
    const newRates = rates.map(r => ({ ...r, [field]: num }))
    setRates(newRates)
  }

  if (loading && companies.length === 0) return <div className="admin-loading"><div className="spinner" /></div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Tarifs de Livraison B2B</h2>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>Tarif de base jusqu'à 5 kg. (+50 DA par kilo supplémentaire)</p>
        </div>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving || !selectedCompanyId}>
          {saving ? 'Enregistrement...' : 'Enregistrer les tarifs B2B'}
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ maxWidth: 400, marginBottom: 0 }}>
          <label>Sélectionner le transporteur</label>
          <select 
            className="form-control" 
            value={selectedCompanyId} 
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="">-- Choisir --</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedCompanyId ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>N°</th>
                <th>Wilaya</th>
                <th>
                  Tarif B2B Domicile (DA)
                  <button className="btn-icon" style={{fontSize: '0.8rem', marginLeft: 10}} onClick={() => applyToAll('b2b_price_home', window.prompt('Saisir le tarif à domicile par défaut :'))} title="Appliquer à tous">⬇️</button>
                </th>
                <th>
                  Tarif B2B Bureau/Relais (DA)
                  <button className="btn-icon" style={{fontSize: '0.8rem', marginLeft: 10}} onClick={() => applyToAll('b2b_price_desk', window.prompt('Saisir le tarif bureau par défaut :'))} title="Appliquer à tous">⬇️</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rates.length === 0 ? (
                <tr><td colSpan="4" className="text-center">Chargement des tarifs...</td></tr>
              ) : (
                rates.map((rate, i) => (
                  <tr key={rate.wilaya_name}>
                    <td>{(i + 1).toString().padStart(2, '0')}</td>
                    <td><strong>{rate.wilaya_name}</strong></td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ maxWidth: 150 }}
                        value={rate.b2b_price_home} 
                        onChange={(e) => handlePriceChange(i, 'b2b_price_home', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ maxWidth: 150 }}
                        value={rate.b2b_price_desk} 
                        onChange={(e) => handlePriceChange(i, 'b2b_price_desk', e.target.value)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center" style={{ padding: '40px 0', color: 'var(--color-gray-500)' }}>
          Veuillez sélectionner ou ajouter un transporteur pour configurer ses tarifs B2B.
        </p>
      )}
    </div>
  )
}
