import { NavLink, useNavigate, Outlet, Navigate } from 'react-router-dom'
import './admin.css'

const NAV_ITEMS = [
  {
    section: 'Général',
    links: [
      { to: '/admin-panel', label: 'Tableau de bord', end: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
      )},
    ]
  },
  {
    section: 'Catalogue',
    links: [
      { to: '/admin-panel/products', label: 'Produits', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      )},
      { to: '/admin-panel/categories', label: 'Catégories', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      )},
      { to: '/admin-panel/banners', label: 'Banners', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      )},
    ]
  },
  {
    section: 'Ventes',
    links: [
      { to: '/admin-panel/orders', label: 'Commandes', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      )},
    ]
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('admin_user') || 'null')

  // Guard: not logged in — use Navigate component, not navigate()
  if (!user) {
    return <Navigate to="/admin-panel/login" replace />
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('admin_user')
    navigate('/admin-panel/login')
  }

  const initials = (user.first_name?.[0] || user.username?.[0] || 'A').toUpperCase()

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h1>PIOVÉ</h1>
          <span>Admin Panel</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(section => (
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
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={handleLogout} id="admin-logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar-title">Administration</span>
          <div className="admin-topbar-user">
            <span>{user.first_name || user.username}</span>
            <div className="admin-avatar">{initials}</div>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
