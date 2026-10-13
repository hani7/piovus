import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import { Send, Mail, X, History, Users, Trash2, Search, CheckCircle2 } from 'lucide-react'
import './admin.css'

export default function AdminNewsletter() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [history, setHistory] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [stats, setStats] = useState({ total_recipients: 0, total_subscribers: 0, total_customers_with_email: 0 })
  const [subscriberSearch, setSubscriberSearch] = useState('')

  const fetchData = () => {
    adminClient.get('/admin/newsletter/send/')
      .then(r => {
        if (Array.isArray(r.data)) {
          setHistory(r.data)
        } else {
          setHistory(r.data.history || [])
          setSubscribers(r.data.subscribers || [])
          setStats(r.data.stats || { total_recipients: 0, total_subscribers: 0, total_customers_with_email: 0 })
        }
      })
      .catch(e => console.error("Erreur chargement newsletter", e))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInsertImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await adminClient.post('/admin/newsletter/upload-image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = res.data.url;
      const imgTag = `\n<img src="${imageUrl}" style="max-width: 100%; border-radius: 8px; margin: 15px 0;" alt="Image" />\n`;
      setMessage(prev => prev + imgTag);
    } catch (err) {
      alert("Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const confirmMsg = `Êtes-vous sûr de vouloir envoyer cette newsletter aux ${stats.total_recipients || 'tous les'} contacts enregistrés ?`
    if (!window.confirm(confirmMsg)) return
    
    setSending(true)
    setFeedback(null)
    try {
      const formData = new FormData()
      formData.append('subject', subject)
      formData.append('message', message)
      if (attachment) {
        formData.append('attachment', attachment)
      }

      const res = await adminClient.post('/admin/newsletter/send/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFeedback({ type: 'success', text: res.data.message })
      setSubject('')
      setMessage('')
      setAttachment(null)
      fetchData()
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || "Erreur lors de l'envoi" })
    } finally {
      setSending(false)
    }
  }

  const handleDeleteSubscriber = async (id, email) => {
    if (!window.confirm(`Désabonner l'adresse ${email} ?`)) return
    try {
      await adminClient.delete('/admin/newsletter/send/', { data: { id } })
      fetchData()
    } catch (err) {
      alert("Erreur lors du désabonnement.")
    }
  }

  const filteredSubscribers = subscribers.filter(s => 
    s.email.toLowerCase().includes(subscriberSearch.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2><Mail size={24} style={{marginRight: 10, verticalAlign: 'middle'}}/> Newsletter & Alertes</h2>
      </div>

      {/* STATS D'AUDIENCE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ margin: 0, padding: '16px 20px', borderLeft: '4px solid #ec4899' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Audience Totale
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>
            {stats.total_recipients}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Contacts uniques prêts à recevoir
          </div>
        </div>

        <div className="admin-card" style={{ margin: 0, padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Abonnés Newsletter
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8b5cf6' }}>
            {stats.total_subscribers}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Inscrits via le formulaire du site
          </div>
        </div>

        <div className="admin-card" style={{ margin: 0, padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Clients E-commerce
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
            {stats.total_customers_with_email}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Comptes clients & acheteurs
          </div>
        </div>

        <div className="admin-card" style={{ margin: 0, padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Campagnes Envoyées
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3b82f6' }}>
            {history.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Historique des diffusions
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* FORMULAIRE */}
        <div className="admin-card" style={{ flex: '1 1 500px', margin: 0 }}>
          <p style={{ marginBottom: 20, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Composez votre message promotionnel ci-dessous. En cliquant sur "Envoyer", un email sera expédié à l'ensemble de votre base ({stats.total_recipients} destinataires uniques).
          </p>

          {feedback && (
            <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'success' ? '#059669' : '#dc2626', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
              {feedback.type === 'success' ? <CheckCircle2 size={20}/> : <X size={20}/>}
              <span style={{ fontWeight: 500 }}>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="admin-form">
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Sujet de l'email <span style={{color: '#ef4444'}}>*</span></label>
              <input 
                className="form-input" 
                required 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Ex: -30% sur notre nouvelle collection !"
                style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontWeight: 600, color: '#334155', margin: 0, display: 'block' }}>Message / Contenu HTML <span style={{color: '#ef4444'}}>*</span></label>
                <div>
                  <input type="file" id="insert-image-upload" accept="image/*" style={{display: 'none'}} onChange={handleInsertImage} />
                  <label htmlFor="insert-image-upload" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 4, fontWeight: 500 }}>
                    {uploadingImage ? 'Upload...' : '📷 Insérer une image'}
                  </label>
                </div>
              </div>
              <textarea 
                className="form-input" 
                required 
                rows={12}
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Rédigez votre email ici. Vous pouvez utiliser des balises HTML pour le formatage (<b>gras</b>, <br> saut de ligne, <a href='...'>lien</a>)."
                style={{ fontFamily: 'monospace', padding: '16px', borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Pièce jointe (Optionnel)</label>
              <div style={{ border: '2px dashed #cbd5e1', padding: 20, borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
                <input 
                  type="file" 
                  id="newsletter-file"
                  accept="image/*,.pdf"
                  onChange={(e) => setAttachment(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="newsletter-file" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 50, color: '#475569', fontWeight: 500, fontSize: '0.9rem' }}>
                  Sélectionner un fichier
                </label>
                {attachment && <div style={{ marginTop: 12, color: '#10b981', fontWeight: 500, fontSize: '0.9rem' }}>📎 {attachment.name}</div>}
              </div>
            </div>

            <div className="admin-modal-actions" style={{ justifyContent: 'flex-start', margin: 0 }}>
              <button type="submit" className="btn" disabled={sending || !subject || !message} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem', background: '#0f172a', color: 'white', borderRadius: 50, border: 'none', width: '100%', justifyContent: 'center', fontWeight: 600}}>
                {sending ? 'Envoi en cours...' : <><Send size={18} /> Envoyer à tous ({stats.total_recipients} destinataires)</>}
              </button>
            </div>
          </form>
        </div>

        {/* APERCU */}
        <div style={{ flex: '1 1 400px', position: 'sticky', top: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={18} /> Aperçu de l'email
          </h3>
          
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}>
            {/* Header Email */}
            <div style={{ background: '#000000', padding: '30px 20px', textAlign: 'center' }}>
              <h1 style={{ color: '#ffffff', margin: 0, fontWeight: 300, letterSpacing: '3px', fontSize: '22px', fontFamily: 'sans-serif' }}>
                PIOVÉ COSMETICS
              </h1>
            </div>
            
            {/* Body Email */}
            <div style={{ padding: '40px 30px', color: '#334155', fontSize: '15px', lineHeight: 1.6, minHeight: 250, fontFamily: 'sans-serif' }} dangerouslySetInnerHTML={{ __html: message || '<span style="color:#94a3b8;font-style:italic">Votre message apparaîtra ici...</span>' }} />
            
            {/* Footer Email */}
            <div style={{ background: '#f8fafc', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b', borderTop: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
              © 2026 Piové Cosmetics. Tous droits réservés.<br/>
              Vous recevez cet email car vous êtes inscrit à notre newsletter ou vous avez passé commande sur notre site.
            </div>
          </div>
        </div>
      </div>

      {/* LISTE DES ABONNES NEWSLETTER */}
      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Users size={18} /> Abonnés au formulaire Newsletter ({subscribers.length})
          </h3>
          <div style={{ position: 'relative', width: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Rechercher un email..." 
              value={subscriberSearch}
              onChange={e => setSubscriberSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 34px', fontSize: '0.85rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Adresse Email</th>
                <th>Date d'inscription</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{idx + 1}</td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{s.email}</strong>
                  </td>
                  <td>
                    {new Date(s.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="text-right">
                    <button 
                      className="btn-icon" 
                      style={{ padding: '4px 8px', background: '#fef2f2', borderRadius: 4, color: '#dc2626', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }} 
                      onClick={() => handleDeleteSubscriber(s.id, s.email)} 
                      title="Désabonner"
                    >
                      <Trash2 size={14} /> Désabonner
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSubscribers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {subscriberSearch ? 'Aucun abonné ne correspond à votre recherche.' : "Aucun abonné enregistré via le formulaire pour le moment."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORIQUE */}
      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <History size={18} /> Historique des Newsletters
          </h3>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date d'envoi</th>
                <th>Sujet</th>
                <th>Contacts atteints</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ fontWeight: 500 }}>{h.subject}</td>
                  <td>
                    <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 8px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                      {h.sent_count} contacts
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    Aucune newsletter n'a encore été envoyée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
