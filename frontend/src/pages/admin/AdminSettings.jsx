import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    free_shipping_threshold: 0,
    new_account_discount_enabled: false,
    new_account_discount_percent: 10,
  })

  useEffect(() => {
    adminClient.get('/admin/settings/')
      .then(res => {
        setForm({
          free_shipping_threshold: res.data.free_shipping_threshold ?? 0,
          new_account_discount_enabled: res.data.new_account_discount_enabled ?? false,
          new_account_discount_percent: res.data.new_account_discount_percent ?? 10,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      await adminClient.post('/admin/settings/', form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-loading">Chargement...</div>

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">⚙️ Paramètres du Site</h1>
      </div>

      {/* ── Free Shipping ──────────────────────── */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>🚚 Livraison Gratuite</h2>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--admin-text-muted)', marginBottom: 16 }}>
            Définissez un montant minimum de commande à partir duquel la livraison est offerte.
            Mettez <strong>0</strong> pour désactiver.
          </p>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label className="form-label">Montant minimum (DA)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="0"
                step="100"
                className="form-input"
                value={form.free_shipping_threshold}
                onChange={e => setForm(f => ({ ...f, free_shipping_threshold: e.target.value }))}
              />
              <span style={{ color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>DA</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 6 }}>
              {form.free_shipping_threshold > 0
                ? `✅ Livraison gratuite à partir de ${Number(form.free_shipping_threshold).toLocaleString('fr-DZ')} DA`
                : '❌ Livraison gratuite désactivée'}
            </p>
          </div>
        </div>
      </div>

      {/* ── New Account Discount ───────────────── */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>🎁 Remise Nouvelle Inscription</h2>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--admin-text-muted)', marginBottom: 20 }}>
            Offrez automatiquement un coupon de réduction aux nouveaux clients qui créent un compte.
          </p>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="toggle-wrap">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.new_account_discount_enabled}
                  onChange={e => setForm(f => ({ ...f, new_account_discount_enabled: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <span style={{ fontWeight: 600, color: form.new_account_discount_enabled ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}>
              {form.new_account_discount_enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>

          {/* Percentage */}
          <div className="form-group" style={{ maxWidth: 280, opacity: form.new_account_discount_enabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            <label className="form-label">Pourcentage de remise (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                className="form-input"
                value={form.new_account_discount_percent}
                disabled={!form.new_account_discount_enabled}
                onChange={e => setForm(f => ({ ...f, new_account_discount_percent: e.target.value }))}
              />
              <span style={{ color: 'var(--admin-text-muted)' }}>%</span>
            </div>
            {form.new_account_discount_enabled && (
              <p style={{ fontSize: '0.78rem', color: 'var(--admin-success)', marginTop: 6 }}>
                ✅ Un coupon de {form.new_account_discount_percent}% sera généré à chaque nouvelle inscription.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving} style={{ minWidth: 160 }}>
          {saving ? 'Enregistrement...' : '💾 Enregistrer'}
        </button>
        {success && (
          <span style={{ color: 'var(--admin-success)', fontWeight: 600, fontSize: '0.9rem' }}>
            ✅ Paramètres sauvegardés !
          </span>
        )}
      </div>
    </div>
  )
}
