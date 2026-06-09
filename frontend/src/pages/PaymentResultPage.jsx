import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import './PaymentResultPage.css' // We can just use inline or simple classes

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const reason = searchParams.get('reason')

  return (
    <div className="payment-result-container container">
      {status === 'success' ? (
        <div className="payment-card success">
          <span className="material-icons result-icon">check_circle</span>
          <h2>Paiement réussi !</h2>
          <p>Merci pour votre achat. Votre commande a été payée et confirmée avec succès.</p>
          <Link to="/shop" className="btn btn-primary">Continuer mes achats</Link>
        </div>
      ) : (
        <div className="payment-card fail">
          <span className="material-icons result-icon">error</span>
          <h2>Échec du paiement</h2>
          <p>
            {reason === 'missing_params' && 'Les paramètres de retour SATIM sont manquants.'}
            {reason === 'order_not_found' && 'La commande est introuvable.'}
            {reason === 'payment_failed' && 'La transaction a été refusée par votre banque ou annulée.'}
            {reason === 'init_failed' && 'Le portail de paiement SATIM est temporairement indisponible ou mal configuré.'}
            {!reason && 'Une erreur inconnue s\'est produite lors du paiement.'}
          </p>
          <p>Votre commande a été enregistrée en attente de paiement. Vous pouvez réessayer plus tard.</p>
          <Link to="/compte/commandes" className="btn btn-accent">Voir mes commandes</Link>
        </div>
      )}
    </div>
  )
}
