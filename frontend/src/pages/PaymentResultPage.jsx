import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import './PaymentResultPage.css'

export default function PaymentResultPage() {
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
            // Track Purchase for SATIM success
            const finalValue = Math.max(0, Number(parsed.total) - Number(parsed.delivery_cost))
            if (window.fbq) {
              window.fbq('track', 'Purchase', {
                value: finalValue,
                currency: 'DZD',
                content_ids: parsed.items?.map(i => i.product_id) || [],
                content_type: 'product'
              })
            }
            if (window.ttq) {
              window.ttq.track('CompletePayment', {
                value: finalValue,
                currency: 'DZD',
                contents: parsed.items?.map(i => ({
                  content_id: i.product_id,
                  content_name: i.product_name || 'Produit',
                  quantity: i.quantity || 1,
                  price: i.price_at_purchase || 0
                })) || []
              })
            }
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
                    <th style={{ textAlign: 'left' }}>Produit</th>
                    <th style={{ textAlign: 'left' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left' }}>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}</td>
                      <td style={{ textAlign: 'left' }}>{item.quantity}</td>
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

          <div className="payment-result__hotline">
            <p>Besoin d'aide ? Contactez-nous gratuitement :</p>
            <img src="/3020.png" alt="3020 Appel Gratuit" style={{ height: 44, marginTop: 8 }} />
          </div>
        </div>
      </main>
    )
  }

  // Determine error message
  let errorMessage = "Paiement échoué ou annulé."

  if (msgParam && msgParam !== 'Paiement annulé ou échoué.' && msgParam !== 'null' && msgParam !== 'undefined') {
    errorMessage = `Paiement refusé : ${msgParam}`
  } else if (reason === 'missing_params') {
    errorMessage = "Paramètres de retour manquants."
  } else if (reason === 'order_not_found') {
    errorMessage = "Commande introuvable."
  } else {
    // They cancelled within less than a minute
    errorMessage = "Vous avez annulé le paiement ou une erreur est survenue."
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

        <div className="payment-result__hotline">
          <p>Besoin d'aide ? Contactez-nous gratuitement :</p>
          <img src="/3020.png" alt="3020 Appel Gratuit" style={{ height: 44, marginTop: 8 }} />
        </div>
      </div>
    </main>
  )
}
