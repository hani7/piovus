import { useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Package, MapPin, Settings, LogOut, Gift, Heart } from 'lucide-react'
import './AccountPage.css'

export default function AccountLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!user) navigate('/compte')
  }, [user, navigate])

  if (!user) return null

  const navItems = [
    { to: '/compte',            label: 'Tableau de bord',     icon: <LayoutDashboard size={18} /> },
    { to: '/compte/commandes',  label: 'Commandes',           icon: <Package size={18} /> },
    { to: '/compte/adresses',   label: 'Adresses',            icon: <MapPin size={18} /> },
    { to: '/compte/fidelite',   label: 'Fidélité',            icon: <Gift size={18} /> },
    { to: '/compte/favoris',    label: 'Favoris',             icon: <Heart size={18} /> },
    { to: '/compte/parametres', label: 'Paramètres',          icon: <Settings size={18} /> },
  ]

  return (
    <main className="account-page page-enter" style={{ paddingTop: '80px' }}>
      <div className="container">

        {/* Mobile tab bar */}
        <nav className="account-tab-bar" aria-label="Navigation du compte">
          {navItems.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`account-tab-item ${pathname === to ? 'active' : ''}`}
              aria-current={pathname === to ? 'page' : undefined}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}
          <button className="account-tab-item text-danger" onClick={logout} aria-label="Se déconnecter">
            <LogOut size={18} aria-hidden="true" />
            <span>Sortir</span>
          </button>
        </nav>

        {/* Desktop layout */}
        <div className="account-dashboard-wrapper">

          {/* Sidebar (desktop only) */}
          <aside className="account-sidebar account-sidebar--desktop">
            <div className="account-sidebar__profile">
              <div className="account-avatar-large">
                {user.first_name?.charAt(0) || user.username?.charAt(0)}
              </div>
              <h3>{user.first_name || user.username}</h3>
              <p>{user.email}</p>
            </div>
            <nav className="account-sidebar__nav" aria-label="Navigation du compte">
              {navItems.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`account-nav-item ${pathname === to ? 'active' : ''}`}
                  aria-current={pathname === to ? 'page' : undefined}
                >
                  {icon} {label}
                </Link>
              ))}
              <button className="account-nav-item text-danger" onClick={logout} aria-label="Se déconnecter">
                <LogOut size={20} aria-hidden="true" /> Déconnexion
              </button>
            </nav>
          </aside>

          {/* Page content */}
          <section className="account-content">
            <Outlet />
          </section>

        </div>
      </div>
    </main>
  )
}
