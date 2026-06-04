import { useState } from 'react'
import adminClient from '../../api/adminClient'
import { Send, Mail } from 'lucide-react'
import './admin.css'

export default function AdminNewsletter() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!window.confirm('Êtes-vous sûr de vouloir envoyer cette newsletter à tous vos clients ?')) return
    
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
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || "Erreur lors de l'envoi" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2><Mail size={24} style={{marginRight: 10, verticalAlign: 'middle'}}/> Newsletter & Alertes</h2>
      </div>

      <div className="admin-card" style={{ maxWidth: 800 }}>
        <p style={{ marginBottom: 20, color: '#666' }}>
          Composez votre message promotionnel ci-dessous. En cliquant sur "Envoyer", un email sera expédié à tous les clients de votre base de données ayant fourni une adresse email valide.
        </p>

        {feedback && (
          <div style={{ marginBottom: 20, padding: 15, borderRadius: 5, backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da', color: feedback.type === 'success' ? '#155724' : '#721c24' }}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSend} className="admin-form">
          <div className="form-group">
            <label>Sujet de l'email *</label>
            <input 
              className="form-input" 
              required 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="Ex: -30% sur notre nouvelle collection !"
            />
          </div>

          <div className="form-group">
            <label>Message / Contenu HTML *</label>
            <textarea 
              className="form-input" 
              required 
              rows={12}
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Rédigez votre email ici. Vous pouvez utiliser des balises HTML pour le formatage (<b>gras</b>, <br> saut de ligne, <a href='...'>lien</a>)."
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label>Pièce jointe (Image ou PDF) - Optionnel</label>
            <input 
              type="file" 
              className="form-input" 
              accept="image/*,.pdf"
              onChange={(e) => setAttachment(e.target.files[0])}
            />
            {attachment && <small style={{display: 'block', marginTop: 5, color: '#666'}}>Fichier sélectionné : {attachment.name}</small>}
          </div>

          <div className="admin-modal-actions" style={{ justifyContent: 'flex-start', marginTop: 20 }}>
            <button type="submit" className="btn btn-accent" disabled={sending || !subject || !message} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              {sending ? 'Envoi en cours...' : <><Send size={16} /> Envoyer à tous les clients</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
