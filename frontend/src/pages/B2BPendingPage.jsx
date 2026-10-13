import { Link } from 'react-router-dom'
import { Clock, Mail } from 'lucide-react'
import './AccountPage.css'

export default function B2BPendingPage() {
  return (
    <main className="account-page account-auth-page page-enter">
      <div className="container auth-single-wrap">
        <section className="auth-form-card b2b-pending-card" aria-labelledby="b2b-pending-title">
          <div className="b2b-pending-icon"><Clock size={32} aria-hidden="true" /></div>
          <h1 id="b2b-pending-title">Votre compte est en attente de vérification</h1>
          <p>Votre demande de compte professionnel B2B a bien été enregistrée. Notre équipe vérifie actuellement votre dossier.</p>
          <div className="b2b-pending-notice">
            <Mail size={24} aria-hidden="true" />
            <p>Après validation, vous recevrez un email de confirmation. Vous pourrez alors vous connecter à votre espace B2B.</p>
          </div>
          <p>La connexion reste indisponible pendant cette vérification. Pensez à consulter vos courriers indésirables.</p>
          <Link to="/" className="btn btn-black">Retour à l’accueil</Link>
          <Link to="/compte">Déjà reçu l’email de validation ? Se connecter</Link>
        </section>
      </div>
    </main>
  )
}
