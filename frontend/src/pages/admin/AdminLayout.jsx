import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, Outlet, Navigate, Link } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Image, ShoppingCart, Briefcase, BarChart2, Users, UserX, Mail, Truck, Banknote, Menu, LogOut, Bell, Ticket, Search, Settings, Film, Sun, Moon, Maximize2, Minimize2, History } from 'lucide-react'
import adminClient from '../../api/adminClient'
import './admin.css'
import CommandMenu from './CommandMenu'

export const NAV_ITEMS = [
  {
    section: 'Général',
    links: [
      { to: '/piove-secure-2026', label: 'Tableau de bord', end: true, icon: <LayoutDashboard size={20} /> },
    ]
  },
  {
    section: 'Catalogue',
    links: [
      { to: '/piove-secure-2026/products', label: 'Produits', icon: <Package size={20} /> },
      { to: '/piove-secure-2026/categories', label: 'Catégories', icon: <Tags size={20} /> },
      { to: '/piove-secure-2026/banners', label: 'Banners', icon: <Image size={20} /> },
    ]
  },
  {
    section: 'Ventes',
    marketingHidden: true,
    links: [
      { to: '/piove-secure-2026/orders', label: 'Commandes', icon: <ShoppingCart size={20} /> },
      { to: '/piove-secure-2026/orders-b2b', label: 'Commandes B2B', icon: <Briefcase size={20} /> },
      { to: '/piove-secure-2026/orders-history', label: 'Historique', icon: <History size={20} /> },
      { to: '/piove-secure-2026/coupons', label: 'Codes Promos', icon: <Ticket size={20} /> },
      { to: '/piove-secure-2026/reports', label: 'Rapports', icon: <BarChart2 size={20} /> },
    ]
  },
  {
    section: 'Clients',
    marketingHidden: true,
    links: [
      { to: '/piove-secure-2026/customers', label: 'Tous les clients', icon: <Users size={20} /> },
      { to: '/piove-secure-2026/b2b-requests', label: 'Demandes B2B', icon: <Briefcase size={20} /> },
      { to: '/piove-secure-2026/blacklist', label: 'Blacklist', icon: <UserX size={20} /> },
      { to: '/piove-secure-2026/newsletter', label: 'Newsletter', icon: <Mail size={20} /> },
    ]
  },
  {
    section: 'Livraison',
    marketingHidden: true,
    links: [
      { to: '/piove-secure-2026/delivery-companies', label: 'Transporteurs', icon: <Truck size={20} /> },
      { to: '/piove-secure-2026/delivery-rates', label: 'Tarifs (Détail)', icon: <Banknote size={20} /> },
      { to: '/piove-secure-2026/b2b-delivery-rates', label: 'Tarifs B2B', icon: <Banknote size={20} /> },
    ]
  },
  {
    section: 'Configuration',
    links: [
      { to: '/piove-secure-2026/mediatheque', label: 'Médiathèque', icon: <Film size={20} /> },
      { to: '/piove-secure-2026/settings', label: 'Paramètres', icon: <Settings size={20} /> },
    ]
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('admin_user') || 'null')
  const isMarketing = user?.groups?.includes('marketing')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [now, setNow] = useState(new Date())
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [unviewed, setUnviewed] = useState({ normal: 0, b2b: 0 })
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_dark_mode') === 'true')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [newOrderToast, setNewOrderToast] = useState(null) // { message, count }

  useEffect(() => {
    localStorage.setItem('admin_dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
  
  // Track previous counts to detect new orders. null means first load.
  const prevUnviewedRef = useRef(null)

  const [notificationPerm, setNotificationPerm] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        setNotificationPerm(perm)
        if (perm === 'granted') {
          playNotificationSound() // play a test sound
          new Notification('Piové Cosmetics Admin', {
            body: "Notifications activées avec succès !",
            icon: '/logo.png'
          })
        }
      })
    }
  }

  // === SONNERIE FORTE — alarme multi-bips ===
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
      masterGain.gain.setValueAtTime(0.85, ctx.currentTime) // volume fort

      // Séquence: 4 bips courts + 1 bip long final
      const pattern = [
        { freq: 1046, start: 0.0,  dur: 0.18 },  // bip 1
        { freq: 1046, start: 0.28, dur: 0.18 },  // bip 2
        { freq: 1046, start: 0.56, dur: 0.18 },  // bip 3
        { freq: 1318, start: 0.84, dur: 0.45 },  // bip grave final (plus long)
      ]

      pattern.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(masterGain)
        osc.type = 'square'           // onde carrée = son perçant
        osc.frequency.value = freq
        g.gain.setValueAtTime(1, ctx.currentTime + start)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur + 0.01)
      })

      // Rejoue 3 fois (total: 3 cycles)
      const totalDur = 1.4
      ;[totalDur, totalDur * 2].forEach(offset => {
        pattern.forEach(({ freq, start, dur }) => {
          const osc = ctx.createOscillator()
          const g = ctx.createGain()
          osc.connect(g)
          g.connect(masterGain)
          osc.type = 'square'
          osc.frequency.value = freq
          g.gain.setValueAtTime(1, ctx.currentTime + offset + start)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + start + dur)
          osc.start(ctx.currentTime + offset + start)
          osc.stop(ctx.currentTime + offset + start + dur + 0.01)
        })
      })
    } catch (e) {
      console.warn('Audio non supporté:', e)
    }
  }

  const triggerDesktopNotification = (message, orderCount) => {
    playNotificationSound()
    // Afficher le toast visuel
    setNewOrderToast({ message, count: orderCount })
    setTimeout(() => setNewOrderToast(null), 8000) // disparaît après 8s
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛍️ Piové — Nouvelle Commande !', {
        body: message,
        icon: '/logo.png'
      })
    }
  }

  const fetchUnviewedCounts = async () => {
    try {
      const res = await adminClient.get('/admin/orders/unviewed_counts/')
      const newCounts = res.data
      
      const prev = prevUnviewedRef.current
      if (prev !== null) {
        const newNormal = newCounts.normal - prev.normal
        const newB2b = newCounts.b2b - prev.b2b
        if (newNormal > 0) {
          triggerDesktopNotification(`${newNormal} nouvelle${newNormal > 1 ? 's' : ''} commande${newNormal > 1 ? 's' : ''} reçue${newNormal > 1 ? 's' : ''} !`, newNormal)
        }
        if (newB2b > 0) {
          triggerDesktopNotification(`${newB2b} nouvelle${newB2b > 1 ? 's' : ''} commande${newB2b > 1 ? 's' : ''} B2B reçue${newB2b > 1 ? 's' : ''} !`, newB2b)
        }
      }
      
      prevUnviewedRef.current = newCounts
      setUnviewed(newCounts)
    } catch (err) {
      // silences error to prevent spam
    }
  }

  useEffect(() => {
    adminClient.get('/admin/settings/').then(res => setIsMaintenance(res.data.is_maintenance_mode)).catch(console.error)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandMenuOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    fetchUnviewedCounts()
    const interval = setInterval(fetchUnviewedCounts, 15000)
    window.addEventListener('ordersViewed', fetchUnviewedCounts)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('ordersViewed', fetchUnviewedCounts)
    }
  }, [])

  const toggleMaintenance = async () => {
    try {
      const res = await adminClient.post('/admin/settings/toggle_maintenance/')
      setIsMaintenance(res.data.is_maintenance_mode)
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  // Inactivity Timeout (15 minutes)
  useEffect(() => {
    let timeoutId
    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        alert("Session expirée pour inactivité.")
        handleLogout()
      }, 15 * 60 * 1000)
    }

    window.addEventListener('mousemove', resetTimeout)
    window.addEventListener('keypress', resetTimeout)
    window.addEventListener('click', resetTimeout)
    window.addEventListener('scroll', resetTimeout)
    resetTimeout()

    return () => {
      window.removeEventListener('mousemove', resetTimeout)
      window.removeEventListener('keypress', resetTimeout)
      window.removeEventListener('click', resetTimeout)
      window.removeEventListener('scroll', resetTimeout)
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Guard: not logged in — use Navigate component, not navigate()
  if (!user) {
    return <Navigate to="/piove-secure-2026/login" replace />
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    localStorage.removeItem('admin_user')
    navigate('/piove-secure-2026/login')
  }

  const initials = (user.first_name?.[0] || user.username?.[0] || 'A').toUpperCase()

  return (
    <div className={`admin-app${darkMode ? ' dark-mode' : ''}`}>

      {/* === TOAST NOUVELLE COMMANDE === */}
      {newOrderToast && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          color: 'white', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(220,38,38,0.5)',
          animation: 'toastSlideIn 0.4s ease',
          fontWeight: 700, fontSize: '1rem', letterSpacing: '0.3px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '1.6rem', animation: 'bellRing 0.5s ease infinite alternate' }}>🛍️</span>
            <div>
              <div style={{ fontSize: '1.05rem' }}>NOUVELLE COMMANDE !</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 400, opacity: 0.9 }}>{newOrderToast.message}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/piove-secure-2026/orders" style={{ background: 'white', color: '#dc2626', padding: '6px 16px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>Voir les commandes</a>
            <button onClick={() => setNewOrderToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className={`admin-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-logo">
          <img src="/logo.png" alt="PIOVÃ‰" style={{ height: '35px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', alignSelf: 'flex-start', marginBottom: '8px' }} />
          <span>Admin Panel</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.filter(s => !isMarketing || !s.marketingHidden).map(section => (
            <div key={section.section} className="admin-nav-section">
              <div className="admin-nav-section-label">{section.section}</div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  {link.icon}
                  <span style={{ flex: 1 }}>{link.label}</span>
                  {link.to === '/piove-secure-2026/orders' && unviewed.normal > 0 && (
                    <span className="admin-nav-badge">{unviewed.normal}</span>
                  )}
                  {link.to === '/piove-secure-2026/orders-b2b' && unviewed.b2b > 0 && (
                    <span className="admin-nav-badge">{unviewed.b2b}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>


      </aside>

      {/* Main */}
      <main className={`admin-main ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--admin-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={24} />
            </button>
            <span className="admin-topbar-title" style={{ marginRight: 24 }}>Administration</span>
            
            {/* Global Search Bar */}
            <button 
              onClick={() => setIsCommandMenuOpen(true)}
              style={{ 
                display: 'flex', alignItems: 'center', background: 'var(--color-gray-100)', 
                borderRadius: '8px', padding: '6px 12px', width: '100%', maxWidth: '280px',
                border: '1px solid var(--admin-border)', cursor: 'pointer', color: 'var(--color-gray-500)',
                fontSize: '0.85rem', justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ marginRight: '8px' }} />
                <span>Recherche globale...</span>
              </div>
              <div style={{ background: 'var(--admin-surface)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid var(--admin-border)' }}>
                Ctrl K
              </div>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Fullscreen Toggle (like F11) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran (F11)'}
              style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: isMaintenance ? 'var(--admin-danger)' : 'var(--admin-success)' }}>
                {isMaintenance ? 'Maintenance' : 'En Ligne'}
              </span>
              <div className="toggle-wrap">
                <label className="toggle" title="Activer/Désactiver le mode maintenance">
                  <input type="checkbox" checked={isMaintenance} onChange={toggleMaintenance} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-500)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
              <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button 
                onClick={requestNotificationPermission}
                title={notificationPerm === 'granted' ? "Notifications activées (Cliquer pour tester)" : "Activer les notifications"}
                style={{ 
                  background: 'none', border: 'none', 
                  color: notificationPerm === 'granted' ? 'var(--admin-success)' : 'var(--admin-text-muted)', 
                  cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' 
                }}
              >
                <Bell size={20} />
                {(unviewed.normal > 0 || unviewed.b2b > 0) && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--admin-danger)', borderRadius: '50%', border: '2px solid var(--admin-surface)' }}></span>
                )}
              </button>
              <div style={{ position: 'relative' }}>
                <div className="admin-topbar-user" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ cursor: 'pointer' }}>
                  <span>{user?.first_name || user?.username}</span>
                  <div className="admin-avatar">{initials}</div>
                </div>
                {isUserMenuOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 200, zIndex: 50 }}>
                     <Link to="/piove-secure-2026/profile" style={{ display: 'block', padding: '12px 16px', color: 'var(--admin-text)', textDecoration: 'none', borderBottom: '1px solid var(--admin-border)' }} onClick={() => setIsUserMenuOpen(false)}>
                      👤 Mon Profil
                    </Link>
                    <Link to="/piove-secure-2026/settings" style={{ display: 'block', padding: '12px 16px', color: 'var(--admin-text)', textDecoration: 'none', borderBottom: '1px solid var(--admin-border)' }} onClick={() => setIsUserMenuOpen(false)}>
                      ⚙️ Paramètres
                    </Link>
                    <Link to="/piove-secure-2026/history" style={{ display: 'block', padding: '12px 16px', color: 'var(--admin-text)', textDecoration: 'none', borderBottom: '1px solid var(--admin-border)' }} onClick={() => setIsUserMenuOpen(false)}>
                      Historique d'activité
                    </Link>
                    <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--admin-danger)', cursor: 'pointer' }} onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}>
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
      
      <CommandMenu isOpen={isCommandMenuOpen} setIsOpen={setIsCommandMenuOpen} />
    </div>
  )
}

