import { useState, useEffect, useRef, useMemo } from 'react'
import adminClient from '../../api/adminClient'
import {
  Image, Video, Upload, Trash2, Copy, CheckCircle,
  Search, ChevronLeft, ChevronRight, LayoutGrid, List, AlertCircle
} from 'lucide-react'

const PAGE_SIZE = 30

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function AdminMediatheque() {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState([])
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(null)
  const [page, setPage]         = useState(1)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const fileRef = useRef()

  // ── Load all files ─────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true)
    adminClient.get('/admin/media/')
      .then(r => setFiles(r.data.results || r.data || []))
      .catch(err => {
        console.error('Erreur chargement médiathèque:', err)
        setFiles([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [filter, search])

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return
    setUploading(true)
    setUploadErrors([])
    const errors = []
    for (const file of selectedFiles) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        await adminClient.post('/admin/media/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } catch (err) {
        const msg = err?.response?.data?.error || `Erreur: ${file.name}`
        errors.push(msg)
        console.error('Upload error:', err)
      }
    }
    setUploadErrors(errors)
    setUploading(false)
    // Refresh list to show newly uploaded files
    load()
    // Reset input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (f) => {
    if (!window.confirm(
      `Supprimer "${f.name}" ?\n\n⚠️ Attention : si cette image est utilisée par un produit ou une bannière, elle disparaîtra du site.`
    )) return
    try {
      await adminClient.delete(`/admin/media/?path=${encodeURIComponent(f.rel_path)}`)
      // Optimistic remove from local state (faster than reloading)
      setFiles(prev => prev.filter(x => x.rel_path !== f.rel_path))
    } catch (err) {
      const msg = err?.response?.data?.error || 'Erreur lors de la suppression'
      alert(`❌ ${msg}`)
    }
  }

  // ── Copy URL ───────────────────────────────────────────────────────────────
  const handleCopy = (url) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Filter + Search ────────────────────────────────────────────────────────
  const filtered = useMemo(() => files.filter(f => {
    const matchFilter = filter === 'all' || f.file_type === filter
    const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.folder?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  }), [files, filter, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const goTo = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getUrl = (f) => f.file?.startsWith('http') ? f.file : `https://api.piovecosmetics.dz${f.file}`

  // ── Pagination component ───────────────────────────────────────────────────
  const Pagination = () => totalPages <= 1 ? null : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--admin-border)' }}>
      <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}
        style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 8, background: 'var(--admin-card)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
        .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
        .map((p, i) => p === '...'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--admin-text-muted)' }}>…</span>
          : <button key={p} onClick={() => goTo(p)} style={{ width: 36, height: 36, border: '1px solid var(--admin-border)', borderRadius: 8, background: p === currentPage ? 'var(--admin-text)' : 'var(--admin-card)', color: p === currentPage ? '#fff' : 'var(--admin-text)', cursor: 'pointer', fontWeight: p === currentPage ? 700 : 400, fontSize: '0.85rem' }}>{p}</button>
        )}
      <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}
        style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 8, background: 'var(--admin-card)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
        <ChevronRight size={16} />
      </button>
    </div>
  )

  // ── Card (grid item) ───────────────────────────────────────────────────────
  const MediaCard = ({ f }) => {
    const isVideo = f.file_type === 'video'
    const url = getUrl(f)
    return (
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
        <div style={{ height: 140, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {isVideo
            ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
            : <img src={url} alt={f.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
          }
        </div>
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
            {isVideo ? <Video size={12} style={{ marginRight: 4 }} /> : <Image size={12} style={{ marginRight: 4 }} />}
            {f.name || 'Sans nom'}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {f.folder || '/'} · {formatSize(f.size)}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleCopy(url)}
              style={{ flex: 1, padding: '4px', background: copied === url ? '#22c55e' : 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 6, cursor: 'pointer', color: copied === url ? '#fff' : 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.72rem' }}>
              {copied === url ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied === url ? 'Copié !' : 'Copier URL'}
            </button>
            <button onClick={() => handleDelete(f)}
              style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Row (list item) ────────────────────────────────────────────────────────
  const MediaRow = ({ f }) => {
    const isVideo = f.file_type === 'video'
    const url = getUrl(f)
    return (
      <tr style={{ borderBottom: '1px solid var(--admin-border)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-hover, rgba(0,0,0,0.02))'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <td style={{ padding: '8px 12px', width: 52 }}>
          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
            {isVideo
              ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              : <img src={url} alt={f.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
            }
          </div>
        </td>
        <td style={{ padding: '8px 12px', maxWidth: 260 }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
        </td>
        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#666' }}>
          <span style={{ background: isVideo ? '#fef3c7' : '#dbeafe', color: isVideo ? '#92400e' : '#1e40af', borderRadius: 20, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
            {isVideo ? 'Vidéo' : 'Image'}
          </span>
        </td>
        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#666' }}>📁 {f.folder || '/'}</td>
        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#666' }}>{formatSize(f.size)}</td>
        <td style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleCopy(url)}
              style={{ padding: '4px 10px', background: copied === url ? '#22c55e' : 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 6, cursor: 'pointer', color: copied === url ? '#fff' : 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {copied === url ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied === url ? 'Copié !' : 'URL'}
            </button>
            <button onClick={() => handleDelete(f)}
              style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
              <Trash2 size={12} /> Supprimer
            </button>
          </div>
        </td>
      </tr>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <h2>Médiathèque</h2>
        <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} />
          {uploading ? 'Import en cours...' : 'Importer des fichiers'}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>Erreurs d'upload :</strong>
            {uploadErrors.map((e, i) => <p key={i} style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>{e}</p>)}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="admin-search" style={{ minWidth: 220 }}>
          <Search size={16} />
          <input placeholder="Nom ou dossier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'image', 'video'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--admin-border)', background: filter === t ? 'var(--admin-text)' : 'transparent', color: filter === t ? '#fff' : 'var(--admin-text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
              {t === 'all' ? 'Tous' : t === 'image' ? '📷 Images' : '🎬 Vidéos'}
            </button>
          ))}
        </div>

        {/* Count */}
        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
          {filtered.length} fichier{filtered.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` · p.${currentPage}/${totalPages}`}
        </span>

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setViewMode('grid')}
            title="Vue grille"
            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'var(--admin-card)' : 'transparent', color: viewMode === 'grid' ? 'var(--admin-text)' : 'var(--admin-text-muted)', boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')}
            title="Vue liste"
            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? 'var(--admin-card)' : 'transparent', color: viewMode === 'list' ? 'var(--admin-text)' : 'var(--admin-text-muted)', boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--admin-text-muted)' }}>
          <Upload size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>{search || filter !== 'all' ? 'Aucun fichier correspondant à votre recherche.' : 'Aucun fichier. Cliquez sur "Importer" pour ajouter des médias.'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {paginated.map(f => <MediaCard key={f.rel_path} f={f} />)}
          </div>
          <Pagination />
        </>
      ) : (
        <>
          <div style={{ border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--admin-card)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 52 }}></th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dossier</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taille</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(f => <MediaRow key={f.rel_path} f={f} />)}
              </tbody>
            </table>
          </div>
          <Pagination />
        </>
      )}
    </div>
  )
}
