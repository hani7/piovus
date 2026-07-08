import React from 'react'

export default function ShippingPage() {
  return (
    <main className="page-enter" style={{ padding: '60px 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', textAlign: 'center' }}>Livraison & Retour</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--color-gray-800)' }}>
          
          <h2 style={{ fontSize: '1.8rem', marginTop: '40px', marginBottom: '20px', color: 'var(--color-primary)' }}>1. Livraison</h2>
          <p style={{ marginBottom: '15px' }}>
            Nous livrons nos produits dans les 58 wilayas d'Algérie grâce à nos partenaires de livraison fiables.
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '30px' }}>
            <li style={{ marginBottom: '10px' }}><strong>Délais de livraison :</strong> Entre 24h et 72h selon votre wilaya.</li>
            <li style={{ marginBottom: '10px' }}><strong>Frais de livraison :</strong> Les frais varient selon votre localisation. La livraison est <strong>GRATUITE</strong> pour toute commande supérieure à 5000 DA !</li>
            <li style={{ marginBottom: '10px' }}><strong>Suivi :</strong> Un numéro de suivi vous sera communiqué dès l'expédition de votre colis.</li>
          </ul>

          <h2 style={{ fontSize: '1.8rem', marginTop: '40px', marginBottom: '20px', color: 'var(--color-primary)' }}>2. Méthodes de Paiement</h2>
          <p style={{ marginBottom: '15px' }}>
            Pour votre confort, nous proposons plusieurs méthodes de paiement sécurisées :
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '30px' }}>
            <li style={{ marginBottom: '10px' }}><strong>Paiement à la livraison (COD) :</strong> Payez en espèces directement au livreur lors de la réception de votre colis.</li>
            <li style={{ marginBottom: '10px' }}><strong>Paiement en ligne (Bientôt) :</strong> Cartes EDAHABIA et CIB.</li>
          </ul>

          <h2 style={{ fontSize: '1.8rem', marginTop: '40px', marginBottom: '20px', color: 'var(--color-primary)' }}>3. Politique de Retour</h2>
          <p style={{ marginBottom: '15px' }}>
            Nous voulons que vous soyez entièrement satisfait(e) de vos achats chez Piové Cosmetics.
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '30px' }}>
            <li style={{ marginBottom: '10px' }}>Vous disposez de <strong>7 jours</strong> à compter de la réception de votre commande pour effectuer un retour.</li>
            <li style={{ marginBottom: '10px' }}>Le produit doit être non ouvert, inutilisé, et dans son emballage d'origine intact.</li>
            <li style={{ marginBottom: '10px' }}>Les frais de retour sont à la charge du client, sauf en cas d'erreur de notre part (produit défectueux ou erreur d'article).</li>
          </ul>
          
          <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f44336' }}>
            <p style={{ margin: 0, color: '#b71c1c' }}>
              <strong>Important :</strong> Pour des raisons d'hygiène et de sécurité, les produits cosmétiques ouverts ou testés ne peuvent être ni repris ni échangés.
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}
