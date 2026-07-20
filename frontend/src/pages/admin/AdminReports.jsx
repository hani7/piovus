import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import adminClient from '../../api/adminClient'
import { FileSpreadsheet, FileText, Calendar, TrendingUp, Package } from 'lucide-react'

export default function AdminReports() {
  const [data, setData] = useState([])
  const [orders, setOrders] = useState([])
  const [annualSummary, setAnnualSummary] = useState([])
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear())
  const [sourceStats, setSourceStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    group_by: 'day', // day, week, month
    status: ''
  })

  // Calculate totals
  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0)
  const totalOrders = data.reduce((acc, curr) => acc + curr.orders_count, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const loadData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.status) params.append('status', filters.status)
    params.append('group_by', filters.group_by)
    params.append('annual_year', annualYear)

    adminClient.get(`/admin/reports/?${params}`)
      .then(r => {
        if (r.data && r.data.chart) {
          setData(r.data.chart)
          setOrders(r.data.orders || [])
          setAnnualSummary(r.data.annual_summary || [])
          setSourceStats(r.data.source_stats || [])
        } else if (Array.isArray(r.data)) {
          setData(r.data)
        } else {
          setData([])
          setOrders([])
          setAnnualSummary([])
          setSourceStats([])
        }
      })
      .catch(e => {
        console.error(e)
        setData([])
        setOrders([])
        setAnnualSummary([])
        setSourceStats([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [filters, annualYear])

  const getExportParams = () => {
    const params = new URLSearchParams()
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.status) params.append('status', filters.status)
    params.append('export', 'json')
    return params
  }

  const handleExportExcel = async () => {
    try {
      const { data } = await adminClient.get(`/admin/reports/?${getExportParams()}`)
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes")
      XLSX.writeFile(workbook, `rapport_ventes_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (e) {
      console.error('Export Excel failed', e)
      alert("Erreur lors de l'exportation Excel")
    }
  }

  const handleExportPDF = async () => {
    const printWindow = window.open('', '', 'width=1000,height=800')
    if (!printWindow) {
      alert("Votre navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups pour ce site.")
      return
    }
    printWindow.document.write('<html><body style="font-family:sans-serif;padding:20px;"><h2>Génération du PDF en cours...</h2></body></html>')

    try {
      const { data } = await adminClient.get(`/admin/reports/?${getExportParams()}`)
      
      let html = `
        <html>
        <head>
          <title>Rapport des Ventes - Piové</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #1a1a1a; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Rapport des Ventes Détaillé</h1>
          <p>Généré le: ${new Date().toLocaleString('fr-DZ')}</p>
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0] || {}).map(k => `<th>${k}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${Object.values(row).map(val => `<td>${val !== null ? val : ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `
      
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)

    } catch (e) {
      console.error('Export PDF failed', e)
      alert("Erreur lors de l'exportation PDF")
      printWindow.close()
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1e293b' }}>{label}</p>
          <p style={{ margin: 0, color: '#0f172a' }}>
            <span style={{ color: '#6366f1', fontWeight: 600 }}>Revenu:</span> {payload[0].value.toLocaleString('fr-DZ')} DA
          </p>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', marginTop: '4px' }}>
            Commandes: {payload[0].payload.orders_count}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="admin-reports page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>Rapports des ventes</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Analysez vos performances de vente et exportez vos données.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportExcel} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#107c41', color: 'white', border: 'none' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dc2626', color: 'white', border: 'none' }}>
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Date de début</label>
          <input 
            type="date" 
            className="form-input" 
            value={filters.start_date} 
            onChange={e => setFilters({...filters, start_date: e.target.value})}
          />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Date de fin</label>
          <input 
            type="date" 
            className="form-input" 
            value={filters.end_date} 
            onChange={e => setFilters({...filters, end_date: e.target.value})}
          />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Statut de commande</label>
          <select 
            className="form-input" 
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="shipped">En livraison</option>
            <option value="fulfilled">Livrée</option>
            <option value="cancelled">Annulée</option>
            <option value="returned">Retournée</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Grouper par</label>
          <select 
            className="form-input" 
            value={filters.group_by}
            onChange={e => setFilters({...filters, group_by: e.target.value})}
          >
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
        </div>
      </div>

      {/* Orders Table - Moved directly under filters */}
      {!loading && (
        <div className="admin-card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>Commandes récentes (limité à 200)</h3>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              Aucune commande récente pour cette période.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table className="admin-table" style={{ margin: 0 }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>N°</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Wilaya</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Total (DA)</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ paddingLeft: '24px', color: '#1e293b' }}>#{o.id}</td>
                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>{o.date}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>{o.customer}</td>
                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>{o.wilaya}</td>
                    <td>
                      <span className={`status-badge status-${o.status}`}>
                        {o.status_display}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 600, color: '#0f172a' }}>{o.total.toLocaleString('fr-DZ')} DA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Chiffre d'affaires</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalRevenue.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>
        
        <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Commandes traitées</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalOrders}</p>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Panier Moyen</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{Math.round(avgOrderValue).toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>
      </div>

      {/* Annual Summary Table - Moved directly under KPI Cards */}
      {!loading && (
        <div className="admin-card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Résumé Annuel Détaillé</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Année:</label>
              <select 
                className="form-input" 
                style={{ width: '100px', margin: 0, padding: '4px 8px' }}
                value={annualYear}
                onChange={e => setAnnualYear(parseInt(e.target.value))}
              >
                {[0, 1, 2, 3].map(i => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ margin: 0, whiteSpace: 'nowrap' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Mois</th>
                  <th style={{ textAlign: 'center' }}>En attente</th>
                  <th style={{ textAlign: 'center' }}>Confirmé</th>
                  <th style={{ textAlign: 'center' }}>En livraison</th>
                  <th style={{ textAlign: 'center' }}>Fulfilled</th>
                  <th style={{ textAlign: 'center' }}>Annulée</th>
                  <th style={{ textAlign: 'center' }}>Retournée</th>
                  <th style={{ textAlign: 'center', background: '#f1f5f9' }}>Total Cmds</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px', background: '#f1f5f9' }}>Revenus (DA)</th>
                </tr>
              </thead>
              <tbody>
                {annualSummary.map((row) => {
                  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
                  return (
                    <tr key={row.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: '24px', fontWeight: 500, color: '#1e293b' }}>{monthNames[row.month - 1]}</td>
                      <td style={{ textAlign: 'center', color: row.pending > 0 ? '#f59e0b' : '#cbd5e1' }}>{row.pending}</td>
                      <td style={{ textAlign: 'center', color: row.confirmed > 0 ? '#3b82f6' : '#cbd5e1' }}>{row.confirmed}</td>
                      <td style={{ textAlign: 'center', color: row.shipped > 0 ? '#8b5cf6' : '#cbd5e1' }}>{row.shipped}</td>
                      <td style={{ textAlign: 'center', color: row.fulfilled > 0 ? '#22c55e' : '#cbd5e1' }}>{row.fulfilled}</td>
                      <td style={{ textAlign: 'center', color: row.cancelled > 0 ? '#ef4444' : '#cbd5e1' }}>{row.cancelled}</td>
                      <td style={{ textAlign: 'center', color: row.returned > 0 ? '#f97316' : '#cbd5e1' }}>{row.returned}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{row.total_orders}</td>
                      <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 700, color: '#0f172a', background: '#f8fafc' }}>{row.total_revenue.toLocaleString('fr-DZ')} DA</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Source Stats */}
      {!loading && sourceStats.length > 0 && (() => {
        // Group by main source to avoid duplicates (e.g. Direct×2, Facebook×N)
        const grouped = sourceStats.reduce((acc, s) => {
          const main = s.source.split(' | ')[0]
          if (!acc[main]) acc[main] = { source: main, count: 0, revenue: 0 }
          acc[main].count += s.count
          acc[main].revenue += s.revenue
          return acc
        }, {})
        const mergedStats = Object.values(grouped).sort((a, b) => b.count - a.count)
        const total = mergedStats.reduce((acc, s) => acc + s.count, 0)
        const SOURCE_COLORS = { fb: '#1877f2', ig: '#e1306c', direct: '#6366f1', referral: '#10b981', google: '#34a853', tiktok: '#010101' }
        return (
          <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Origine des commandes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mergedStats.map(s => {
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                const color = SOURCE_COLORS[s.source] || '#64748b'
                const label = s.source === 'fb' ? 'Facebook' : s.source === 'ig' ? 'Instagram' : s.source === 'direct' ? 'Direct' : s.source === 'referral' ? 'Référent' : s.source === 'google' ? 'Google' : s.source === 'tiktok' ? 'TikTok' : s.source
                return (
                  <div key={s.source}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <strong>{s.count}</strong> commande{s.count > 1 ? 's' : ''} &nbsp;·&nbsp; {s.revenue.toLocaleString('fr-DZ')} DA &nbsp;·&nbsp; {pct}%
                      </span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 20, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Chart */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Évolution des revenus</h3>
        <div style={{ height: '400px', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : data.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
              Aucune donnée pour cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="period" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `${val >= 1000 ? (val/1000)+'k' : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Custom Filtered Table */}
      {!loading && data.length > 0 && (
        <div className="admin-card" style={{ padding: '0', marginTop: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Détails de la période filtrée</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ margin: 0, whiteSpace: 'nowrap' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Période</th>
                  <th style={{ textAlign: 'center' }}>En attente</th>
                  <th style={{ textAlign: 'center' }}>Confirmé</th>
                  <th style={{ textAlign: 'center' }}>En livraison</th>
                  <th style={{ textAlign: 'center' }}>Fulfilled</th>
                  <th style={{ textAlign: 'center' }}>Annulée</th>
                  <th style={{ textAlign: 'center' }}>Retournée</th>
                  <th style={{ textAlign: 'center', background: '#f1f5f9' }}>Total Cmds</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px', background: '#f1f5f9' }}>Revenus (DA)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ paddingLeft: '24px', fontWeight: 500, color: '#1e293b' }}>{row.period}</td>
                    <td style={{ textAlign: 'center', color: row.pending > 0 ? '#f59e0b' : '#cbd5e1' }}>{row.pending || 0}</td>
                    <td style={{ textAlign: 'center', color: row.confirmed > 0 ? '#3b82f6' : '#cbd5e1' }}>{row.confirmed || 0}</td>
                    <td style={{ textAlign: 'center', color: row.shipped > 0 ? '#8b5cf6' : '#cbd5e1' }}>{row.shipped || 0}</td>
                    <td style={{ textAlign: 'center', color: row.fulfilled > 0 ? '#22c55e' : '#cbd5e1' }}>{row.fulfilled || 0}</td>
                    <td style={{ textAlign: 'center', color: row.cancelled > 0 ? '#ef4444' : '#cbd5e1' }}>{row.cancelled || 0}</td>
                    <td style={{ textAlign: 'center', color: row.returned > 0 ? '#f97316' : '#cbd5e1' }}>{row.returned || 0}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{row.orders_count || 0}</td>
                    <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 700, color: '#0f172a', background: '#f8fafc' }}>{(row.revenue || 0).toLocaleString('fr-DZ')} DA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
