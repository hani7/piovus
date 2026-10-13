import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Heart, MapPin, Package, Settings, ShoppingBag } from 'lucide-react'
import client from '../api/client'

const orderStatuses = {
  pending: 'En attente', en_cours: 'En cours', confirmed: 'Confirmée',
  shipped: 'En livraison', fulfilled: 'Livrée', cancelled: 'Annulée',
  returned: 'Retournée', payment_failed: 'Paiement échoué', boutique: 'En boutique',
}
const formatDate = value => new Date(value).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
const formatAmount = value => Number(value).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })

export default function B2BAccountDashboard({ user, wishlistCount }) {
  const [summary, setSummary] = useState({ orders: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const profile = user.profile || {}

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    client.get('/orders/', { params: { page_size: 3 } })
      .then(({ data }) => {
        if (!active) return
        const orders = Array.isArray(data) ? data : data.results || []
        setSummary({ orders: orders.slice(0, 3), count: data.count ?? orders.length })
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id, attempt])

  const lastOrder = summary.orders[0]
  const metrics = [
    { label: 'Commandes', value: loading ? '…' : error ? '—' : summary.count, Icon: Package },
    { label: 'Produits favoris', value: wishlistCount, Icon: Heart },
    { label: 'Dernière commande', value: loading ? '…' : error ? '—' : lastOrder ? formatDate(lastOrder.created_at) : 'Aucune', Icon: ShoppingBag },
  ]
  const shortcuts = [
    { to: '/compte/adresses', title: 'Mes adresses', text: 'Vos coordonnées de livraison.', Icon: MapPin },
    { to: '/compte/favoris', title: 'Ma sélection', text: 'Retrouvez vos produits favoris.', Icon: Heart },
    { to: '/compte/parametres', title: 'Mes paramètres', text: 'Vos informations et votre sécurité.', Icon: Settings },
  ]

  return (
    <div className="b2b-dashboard">
      <section className="b2b-account-hero" aria-labelledby="b2b-welcome-title">
        <div className="b2b-account-hero__top">
          <span className="b2b-account-eyebrow">Piové • Partenaires professionnels</span>
          <img src="/logo.png" alt="Piové Cosmetics" className="b2b-account-hero__logo" />
        </div>
        <h1 id="b2b-welcome-title">Votre espace professionnel.</h1>
        <p className="b2b-account-hero__greeting">Bienvenue, {user.first_name || user.username}.</p>
        <p>Retrouvez le catalogue, préparez vos achats et suivez les commandes de {profile.company_name || 'votre entreprise'} en un seul endroit.</p>
        <div className="b2b-account-hero__actions">
          <Link to="/shop" className="b2b-account-button">Accéder au catalogue <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link to="/compte/commandes" className="b2b-account-hero__link">Mes commandes <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="b2b-account-metrics" aria-label="Aperçu de votre compte" aria-busy={loading}>
        {metrics.map(({ label, value, Icon }) => (
          <div className="b2b-account-metric" key={label}>
            <span className="b2b-account-metric__icon"><Icon size={20} aria-hidden="true" /></span>
            <div><span className="b2b-account-metric__value">{value}</span><span className="b2b-account-metric__label">{label}</span></div>
          </div>
        ))}
      </div>

      <div className="b2b-account-details">
        <section className="b2b-account-panel" aria-labelledby="b2b-orders-title">
          <div className="b2b-account-panel__heading"><h2 id="b2b-orders-title">Dernières commandes</h2><Package size={20} aria-hidden="true" /></div>
          {loading ? (
            <p className="b2b-account-empty" role="status">Chargement de vos commandes…</p>
          ) : error ? (
            <div className="b2b-account-empty" role="alert">
              <p>Impossible de charger vos commandes.</p>
              <button className="b2b-account-text-link" onClick={() => setAttempt(value => value + 1)}>Réessayer</button>
            </div>
          ) : summary.orders.length ? (
            <ul className="b2b-account-orders">
              {summary.orders.map(order => (
                <li key={order.id}>
                  <div><strong>Commande #{order.id}</strong><time dateTime={order.created_at}>{formatDate(order.created_at)}</time></div>
                  <div className="b2b-account-order__summary">
                    <strong>{formatAmount(order.total)} DA</strong>
                    <span className={`b2b-account-status b2b-account-status--${order.status}`}>{orderStatuses[order.status] || order.status_display || 'En traitement'}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="b2b-account-empty"><p>Votre première commande commence ici.</p><Link className="b2b-account-text-link" to="/shop">Découvrir le catalogue <ArrowRight size={15} aria-hidden="true" /></Link></div>
          )}
          <Link className="b2b-account-panel__footer" to="/compte/commandes">Voir toutes mes commandes <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>

        <section className="b2b-account-panel" aria-labelledby="b2b-company-title">
          <div className="b2b-account-panel__heading"><h2 id="b2b-company-title">Mon entreprise</h2><Building2 size={20} aria-hidden="true" /></div>
          <dl className="b2b-account-company">
            {[
              ['Entreprise', profile.company_name], ['Email', user.email],
              ['Téléphone', profile.phone], ['Registre de commerce', profile.nrc], ['NIF', profile.nif],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Non renseigné'}</dd></div>)}
          </dl>
          <Link className="b2b-account-panel__footer" to="/contact">Contacter l’équipe Piové <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>

      <section aria-labelledby="b2b-shortcuts-title">
        <h2 id="b2b-shortcuts-title" className="b2b-account-section-title">Votre compte, en toute simplicité</h2>
        <div className="b2b-account-shortcuts">
          {shortcuts.map(({ to, title, text, Icon }) => (
            <Link className="b2b-account-shortcut" to={to} key={to}>
              <Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><ArrowRight className="b2b-account-shortcut__arrow" size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
