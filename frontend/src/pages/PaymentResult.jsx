import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import './PaymentResult.css'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const orderId = searchParams.get('order_id')
  const reason = searchParams.get('reason')
  const msgParam = searchParams.get('msg')
  
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (status === 'success') {
      const savedOrder = localStorage.getItem('lastOrder')
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder)
          // Ensure it's the correct order
          if (!orderId || String(parsed.id) === String(orderId)) {
            setOrder(parsed)
          }
        } catch (e) {
          console.error("Could not parse saved order", e)
        }
      }
    }
  }, [status, orderId])

  const handlePrint = () => {
    window.print()
  }

  if (status === 'success') {
    return (
      <main className="payment-result-page page-enter">
        <div className="payment-result__card">
          <div className="payment-result__icon payment-result__icon--success">✓</div>
          <h1 className="payment-result__title">Paiement Réussi !</h1>
          <p className="payment-result__desc">
            Merci pour votre achat. Votre paiement CIB/Edahabia a été validé avec succès.
            {order ? " Voici votre facture :" : ""}
          </p>

          {order && (
            <div className="invoice-box">
              <div className="invoice-header">
                <h3>Facture Piové Cosmetics</h3>
                <span>Commande #{order.id}</span>
              </div>
              
              <div className="invoice-details">
                <div>
                  <strong>Client :</strong> {order.guest_name || 'Client'}<br/>
                  <strong>Email :</strong> {order.guest_email || 'N/A'}<br/>
                  <strong>Téléphone :</strong> {order.guest_phone || 'N/A'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}<br/>
                  <strong>Mode de paiement :</strong> CIB / Edahabia
                </div>
              </div>

              <table className="invoice-items">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Qté</th>
                    <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}</td>
                      <td>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{Number(item.price_at_purchase).toLocaleString('fr-DZ')} DA</td>
                      <td style={{ textAlign: 'right' }}>{(Number(item.price_at_purchase) * item.quantity).toLocaleString('fr-DZ')} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-totals">
                <div className="total-row">
                  <span>Sous-total produits :</span>
                  <span>
                    {(order.items || []).reduce((acc, item) => acc + (Number(item.price_at_purchase) * item.quantity), 0).toLocaleString('fr-DZ')} DA
                  </span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="total-row" style={{ color: 'var(--color-primary)' }}>
                    <span>Remise :</span>
                    <span>-{Number(order.discount_amount).toLocaleString('fr-DZ')} DA</span>
                  </div>
                )}
                <div className="total-row">
                  <span>Livraison :</span>
                  <span>{Number(order.delivery_cost) > 0 ? `${Number(order.delivery_cost).toLocaleString('fr-DZ')} DA (À payer au livreur)` : 'Gratuite'}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total payé en ligne :</span>
                  <span>{Math.max(0, Number(order.total) - Number(order.delivery_cost)).toLocaleString('fr-DZ')} DA</span>
                </div>
              </div>
            </div>
          )}

          <div className="payment-result__actions">
            {order && <button onClick={handlePrint} className="btn btn-outline">Télécharger le reçu</button>}
            <Link to="/shop" className="btn btn-accent">Continuer mes achats</Link>
          </div>
        </div>
      </main>
    )
  }

  // Determine error message
  let errorMessage = "Une erreur est survenue lors du paiement."
  
  if (reason === 'timeout' || (msgParam && msgParam.toLowerCase().includes('time out')) || (msgParam && msgParam.toLowerCase().includes('timeout'))) {
    errorMessage = "Votre transaction a été rejetée, Délai de traitement dépassé, veuillez réessayer ultérieurement."
  } else if (msgParam) {
    // If SATIM sent a message but the user wants the specific timeout message if it takes too long, 
    // we can use the requested string directly if there's any mention of failure.
    // The user specifically requested: "if it takes a lot of time to process the payment it displays this message: Votre transaction a été rejetée, Délai de traitement dépassé, veuillez réessayer ultérieurement"
    // Since SATIM timeout responses can be generic or empty, we will make this the default for 'payment_failed' if msg doesn't exist,
    // but if msg is provided by SATIM, we append it unless it's a known timeout.
    errorMessage = `Paiement refusé : ${msgParam}`
    // If user's request implies all generic failures that are "taking a lot of time" should be this message,
    // let's just make it the default for missing/generic timeout messages.
  }
  
  // Specific fallback override for the user's request:
  if (!msgParam || reason === 'payment_failed') {
    if (!msgParam || msgParam === 'Paiement annulé ou échoué.' || msgParam === 'null' || msgParam === 'undefined') {
        errorMessage = "Votre transaction a été rejetée, Délai de traitement dépassé, veuillez réessayer ultérieurement."
    }
  }

  return (
    <main className="payment-result-page page-enter">
      <div className="payment-result__card">
        <div className="payment-result__icon payment-result__icon--error">✕</div>
        <h1 className="payment-result__title">Paiement Échoué</h1>
        <p className="payment-result__desc" style={{ color: '#C62828', fontWeight: 500 }}>
          {errorMessage}
        </p>
        <p className="payment-result__desc">
          Votre commande n'a pas pu être finalisée. Vous pouvez réessayer de payer ou choisir le paiement à la livraison.
        </p>

        <div className="payment-result__actions">
          <Link to="/cart" className="btn btn-accent">Retourner au panier</Link>
          <Link to="/contact" className="btn btn-outline">Nous contacter</Link>
        </div>
      </div>
    </main>
  )
}
