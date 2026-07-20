import { useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Package, MapPin, Settings, LogOut, Gift } from 'lucide-react'
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
    { to: '/compte',            label: 'Tableau de bord',     icon: <LayoutDashboard size={20} /> },
    { to: '/compte/commandes',  label: 'Mes Commandes',       icon: <Package size={20} /> },
    { to: '/compte/adresses',   label: 'Mes Adresses',        icon: <MapPin size={20} /> },
    { to: '/compte/fidelite',   label: 'Fidélité & Portefeuille', icon: <Gift size={20} /> },
    { to: '/compte/parametres', label: 'Paramètres',          icon: <Settings size={20} /> },
  ]

  return (
    <main className="account-page page-enter container" style={{ paddingTop: '120px' }}>
      <div className="account-dashboard-wrapper">

        {/* Sidebar */}
        <aside className="account-sidebar">
          <div className="account-sidebar__profile">
            <div className="account-avatar-large">
              {user.first_name?.charAt(0) || user.username?.charAt(0)}
            </div>
            <h3>{user.first_name || user.username}</h3>
            <p>{user.email}</p>
          </div>
          <nav className="account-sidebar__nav">
            {navItems.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`account-nav-item ${pathname === to ? 'active' : ''}`}
              >
                {icon} {label}
              </Link>
            ))}
            <button className="account-nav-item text-danger" onClick={logout}>
              <LogOut size={20} /> Déconnexion
            </button>
          </nav>
        </aside>

        {/* Page content */}
        <section className="account-content">
          <Outlet />
        </section>

      </div>
    </main>
  )
}
