import { useState, useEffect } from 'react'
import adminClient from '../../api/adminClient'
import { useAuthStore } from '../../store/authStore'
import { ShieldAlert, Monitor, Smartphone } from 'lucide-react'
import { UAParser } from 'ua-parser-js'

export default function AdminUserHistory() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminClient.get('/admin/activity-logs/')
      .then(res => setLogs(res.data.results || res.data))
      .catch(() => alert("Impossible de charger l'historique."))
      .finally(() => setLoading(false))
  }, [])

  const parseUserAgent = (uaString) => {
    if (!uaString) return { label: '-', icon: null }
    const parser = new UAParser(uaString)
    const res = parser.getResult()
    const browser = res.browser.name || 'Navigateur Inconnu'
    const os = res.os.name || 'OS Inconnu'
    const deviceType = res.device.type
    
    let label = `${browser} sur ${os}`
    let icon = <Monitor size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
    
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      icon = <Smartphone size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
    }
    
    return { label, icon }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Historique d'Activité</h2>
      </div>

      <div className="admin-card" style={{ marginBottom: 24, padding: 20, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
        <ShieldAlert size={24} color="#3b82f6" />
        <div style={{ fontSize: '0.9rem', color: 'var(--admin-text)' }}>
          <strong>Sécurité renforcée :</strong> Les journaux d'activité ci-dessous sont immuables et ne peuvent pas être supprimés. Ils tracent vos actions critiques pour garantir la sécurité de la plateforme.
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date et Heure</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Appareil</th>
              <th>Adresse IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucune activité récente.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }).replace(' à ', ' - ')}
                  </td>
                  <td><strong>{log.user_name || user?.username}</strong></td>
                  <td style={{ color: 'var(--admin-text)' }}>{log.action}</td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }} title={log.user_agent}>
                    {(() => {
                      const parsed = parseUserAgent(log.user_agent)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {parsed.icon} {parsed.label}
                        </div>
                      )
                    })()}
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)' }}>{log.ip_address || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
