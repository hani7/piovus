import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Maximize2, Minimize2, Sun, Moon, Store } from 'lucide-react'
import '../admin/admin.css' // Reuse the exact same admin CSS

export default function BoutiqueLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  
  const [boutiqueInfo, setBoutiqueInfo] = useState(null)
  const [user, setUser] = useState(null)
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [now, setNow] = useState(new Date())
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_dark_mode') === 'true')
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('boutique_access_token')
    if (!token) {
      navigate('/boutique/login')
      return
    }
    try {
      const u = JSON.parse(localStorage.getItem('boutique_user') || 'null')
      const b = JSON.parse(localStorage.getItem('boutique_info') || 'null')
      if (u && b) {
        setUser(u)
        setBoutiqueInfo(b)
      } else {
        handleLogout()
      }
    } catch (e) {
      handleLogout()
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('boutique_access_token')
    localStorage.removeItem('boutique_refresh_token')
    localStorage.removeItem('boutique_user')
    localStorage.removeItem('boutique_info')
    window.location.href = '/boutique/login'
  }

  if (!boutiqueInfo || !user) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>

  const initials = (user.first_name?.[0] || user.username?.[0] || 'B').toUpperCase()

  return (
    <div className={`admin-app${darkMode ? ' dark-mode' : ''}`}>
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-logo">
          <img src="/logo.png" alt="PIOVÉ" style={{ height: '35px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', alignSelf: 'flex-start', marginBottom: '8px' }} />
          <span>Espace Boutique</span>
        </div>

        <div style={{ padding: '0 20px', marginBottom: '15px' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Store size={14} color="#cc0000" />
                    {boutiqueInfo.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>{boutiqueInfo.wilaya}</div>
            </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">
            <div className="admin-nav-section-label">Général</div>
            <NavLink
              to="/boutique"
              end
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <LayoutDashboard size={20} />
              <span style={{ flex: 1 }}>Tableau de bord</span>
            </NavLink>
          </div>
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
            <span className="admin-topbar-title" style={{ marginRight: 24 }}>Espace Boutique</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Fullscreen Toggle */}
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

            <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-500)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
              <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <div className="admin-topbar-user" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ cursor: 'pointer' }}>
                <span>{user?.first_name || user?.username}</span>
                <div className="admin-avatar">{initials}</div>
              </div>
              {isUserMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 200, zIndex: 50 }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--admin-danger)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}>
                    <LogOut size={16} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
