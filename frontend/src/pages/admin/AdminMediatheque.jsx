import { useState, useEffect, useRef, useMemo } from 'react'
import adminClient from '../../api/adminClient'
import { Image, Video, Upload, Trash2, Copy, CheckCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 30

export default function AdminMediatheque() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)
  const [page, setPage] = useState(1)
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    adminClient.get('/admin/media/')
      .then(r => setFiles(r.data.results || r.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1) }, [filter, search])

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return
    setUploading(true)
    for (const file of selectedFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', file.name)
      try {
        await adminClient.post('/admin/media/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    setUploading(false)
    load()
  }

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer "${f.name}" ?\n⚠️ Si cette image est utilisée par un produit ou une bannière, elle disparaîtra du site.`)) return
    await adminClient.delete(`/admin/media/?path=${encodeURIComponent(f.rel_path)}`).catch(console.error)
    load()
  }

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  // All filtered results
  const filtered = useMemo(() => files.filter(f => {
    const matchFilter = filter === 'all' || f.file_type === filter
    const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  }), [files, filter, search])

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const goTo = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Médiathèque</h2>
        <button
          className="btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Upload size={16} />
          {uploading ? 'Import en cours...' : 'Importer des fichiers'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="admin-search" style={{ minWidth: 220 }}>
          <Search size={16} />
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'image', 'video'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--admin-border)',
                background: filter === t ? 'var(--admin-text)' : 'transparent',
                color: filter === t ? '#fff' : 'var(--admin-text)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
              }}
            >
              {t === 'all' ? 'Tous' : t === 'image' ? '📷 Images' : '🎬 Vidéos'}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
          {filtered.length} fichier{filtered.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` — page ${currentPage}/${totalPages}`}
        </span>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--admin-text-muted)' }}>
          <Upload size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>Aucun fichier. Cliquez sur "Importer" pour ajouter des médias.</p>
        </div>
      ) : (
        <>
          {/* Grid — only current page */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16
          }}>
            {paginated.map(f => {
              const isVideo = f.file_type === 'video' || f.file?.match(/\.(mp4|webm|mov)$/i)
              const url = f.file?.startsWith('http') ? f.file : `https://api.piovecosmetics.dz${f.file}`
              return (
                <div key={f.id} style={{
                  background: 'var(--admin-card)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'box-shadow 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Preview */}
                  <div style={{ height: 140, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {isVideo ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : (
                      <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={e => { e.target.style.display = 'none' }} />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                      {isVideo ? <Video size={12} style={{ marginRight: 4 }} /> : <Image size={12} style={{ marginRight: 4 }} />}
                      {f.name || 'Sans nom'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📁 {f.folder || '/'}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleCopy(url)}
                        title="Copier l'URL"
                        style={{ flex: 1, padding: '4px', background: copied === url ? '#22c55e' : 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 6, cursor: 'pointer', color: copied === url ? '#fff' : 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.72rem' }}
                      >
                        {copied === url ? <CheckCircle size={12} /> : <Copy size={12} />}
                        {copied === url ? 'Copié' : 'URL'}
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        title="Supprimer"
                        style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--admin-border)' }}>
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 8, background: 'var(--admin-card)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--admin-text-muted)' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    style={{
                      width: 36, height: 36, border: '1px solid var(--admin-border)', borderRadius: 8,
                      background: p === currentPage ? 'var(--admin-text)' : 'var(--admin-card)',
                      color: p === currentPage ? '#fff' : 'var(--admin-text)',
                      cursor: 'pointer', fontWeight: p === currentPage ? 700 : 400, fontSize: '0.85rem'
                    }}
                  >
                    {p}
                  </button>
                ))
              }

              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 8, background: 'var(--admin-card)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
