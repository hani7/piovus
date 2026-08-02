import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Store, LogOut, Package, LayoutDashboard, Menu, X } from 'lucide-react'

export default function BoutiqueLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [boutiqueInfo, setBoutiqueInfo] = useState(null)
  const [user, setUser] = useState(null)
  const [isSidebarOpen, setSidebarOpen] = useState(false)

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

  if (!boutiqueInfo) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>

  const NAV_ITEMS = [
    { to: '/boutique', label: 'Tableau de bord', icon: <LayoutDashboard size={20} />, end: true },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{ 
          width: '260px', 
          background: '#fff', 
          borderRight: '1px solid #e2e8f0', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          zIndex: 50,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
        className="md-sidebar-fixed" // In a real app, use CSS media queries to set transform: translateX(0) on md screens and static position
      >
        <style>{`
          @media (min-width: 768px) {
            .md-sidebar-fixed { transform: translateX(0) !important; position: sticky !important; }
            .mobile-header-btn { display: none !important; }
          }
        `}</style>

        <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#be123c' }}>
            <Store size={24} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Espace Boutique</span>
          </div>
          <button className="mobile-header-btn" onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: 20, padding: 12, background: '#fdf2f8', borderRadius: 8, color: '#9f1239' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{boutiqueInfo.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{boutiqueInfo.wilaya}</div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NAV_ITEMS.map((item, i) => {
              const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to)
              return (
                <Link
                  key={i}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500,
                    color: isActive ? '#be123c' : '#475569',
                    background: isActive ? '#fdf2f8' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', 
              background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer',
              borderRadius: '8px'
            }}
          >
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <button className="mobile-header-btn" onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', marginRight: 16, cursor: 'pointer' }}>
            <Menu size={24} color="#0f172a" />
          </button>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            Bienvenue, {user?.first_name || user?.username}
          </div>
        </header>
        
        <main style={{ flex: 1, padding: '24px', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
