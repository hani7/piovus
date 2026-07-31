import { useState, useEffect, useMemo } from 'react'
import adminClient from '../../api/adminClient'
import './admin.css'

export default function AdminBlacklist() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [perPage, setPerPage]   = useState(25)
  const [page, setPage]         = useState(1)

  useEffect(() => { fetchBlacklist() }, [])

  const fetchBlacklist = async () => {
    setLoading(true)
    try {
      const res = await adminClient.get('/admin/customers/?is_blacklisted=true&page_size=1000')
      setCustomers(res.data.results || res.data)
      setError(null)
    } catch {
      setError('Erreur lors du chargement de la liste noire.')
    } finally {
      setLoading(false)
    }
  }

  const removeBlacklist = async (customer) => {
    if (!window.confirm('Voulez-vous vraiment retirer ce client de la liste noire ?')) return
    try {
      await adminClient.patch(`/admin/customers/${customer.id}/`, { is_blacklisted: false })
      fetchBlacklist()
    } catch {
      alert('Erreur lors de la mise à jour du statut du client.')
    }
  }

  // ── Search filter ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      (c.name  || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, search])

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage   = Math.min(page, totalPages)
  const visible    = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handlePerPage = (e) => { setPerPage(Number(e.target.value)); setPage(1) }

  if (loading && customers.length === 0) return <div className="admin-loading"><div className="spinner" /></div>
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2>Blacklist</h2>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.85rem', marginTop: 3 }}>
            Les clients dans cette liste verront leurs futures commandes signalées en rouge dans votre tableau de bord.
          </p>
        </div>
        <span style={{
          background: '#fee2e2', color: '#dc2626', fontWeight: 700,
          borderRadius: 8, padding: '4px 12px', fontSize: '0.85rem',
        }}>
          🚫 {customers.length} client{customers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Rechercher par nom, téléphone, email…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px 8px 32px',
              border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: '0.85rem', outline: 'none',
              background: 'white',
            }}
          />
        </div>

        {/* Per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Afficher</span>
          <select
            value={perPage}
            onChange={handlePerPage}
            className="admin-filter-select"
            style={{ padding: '7px 10px', fontSize: '0.82rem', minWidth: 70 }}
          >
            {[25, 50, 75, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>par page</span>
        </div>

        {/* Count */}
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="admin-table-wrap" style={{ borderTop: '3px solid #dc3545' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Date d'ajout</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan="6" className="text-center" style={{ padding: '32px', color: '#94a3b8' }}>
                {search ? `Aucun résultat pour "${search}"` : 'Aucun client dans la liste noire.'}
              </td></tr>
            ) : visible.map(c => (
              <tr key={c.id}>
                <td style={{ color: '#64748b' }}>#{c.id}</td>
                <td><strong>{c.name || 'Client Anonyme'}</strong></td>
                <td>{c.phone}</td>
                <td>{c.email || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                <td>{new Date(c.updated_at).toLocaleDateString('fr-DZ')}</td>
                <td className="text-right">
                  <button
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => removeBlacklist(c)}
                  >
                    Retirer de la liste
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
              background: 'white', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              color: safePage === 1 ? '#cbd5e1' : '#374151', fontSize: '0.85rem',
            }}
          >‹</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '…' ? (
              <span key={`ellipsis-${i}`} style={{ color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '5px 11px', borderRadius: 7,
                  border: `1px solid ${p === safePage ? '#e11d48' : '#e2e8f0'}`,
                  background: p === safePage ? '#e11d48' : 'white',
                  color: p === safePage ? 'white' : '#374151',
                  fontWeight: p === safePage ? 700 : 400,
                  fontSize: '0.85rem', cursor: 'pointer',
                }}
              >{p}</button>
            ))
          }

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
              background: 'white', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
              color: safePage === totalPages ? '#cbd5e1' : '#374151', fontSize: '0.85rem',
            }}
          >›</button>
        </div>
      )}
    </div>
  )
}
