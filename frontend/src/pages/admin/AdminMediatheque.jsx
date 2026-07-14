import { useState, useEffect, useRef } from 'react'
import adminClient from '../../api/adminClient'
import { Image, Video, Upload, Trash2, Copy, CheckCircle, Search } from 'lucide-react'

export default function AdminMediatheque() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all') // all, image, video
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    adminClient.get('/admin/media/?page_size=500')
      .then(r => setFiles(r.data.results || r.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
    if (!window.confirm(`Supprimer "${f.name}" ?\n⚠️ Attention : si cette image est utilisée par un produit ou une bannière, elle disparaîtra du site.`)) return
    await adminClient.delete(`/admin/media/?path=${encodeURIComponent(f.rel_path)}`).catch(console.error)
    load()
  }

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = files.filter(f => {
    const matchFilter = filter === 'all' || f.file_type === filter
    const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16
        }}>
          {filtered.map(f => {
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
                    <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
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
      )}
    </div>
  )
}
