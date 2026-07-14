import React from 'react'

export default function TermsPage() {
  return (
    <main className="page-enter" style={{ paddingTop: 'calc(var(--navbar-height) + 40px)', paddingBottom: '60px', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textAlign: 'center' }}>Conditions Générales d'Utilisation</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', marginBottom: '40px', fontSize: '0.9rem' }}>
          Dernière mise à jour : Juillet 2026
        </p>

        <div style={{ lineHeight: '1.9', fontSize: '1rem', color: 'var(--color-gray-700)' }}>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>1. Présentation du site</h2>
          <p><strong>Piové Cosmetics</strong> est une boutique en ligne de maquillage et soins cosmétiques basée en Algérie. L'utilisation de ce site implique l'acceptation pleine et entière des présentes conditions générales d'utilisation.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>2. Création de compte</h2>
          <p>Pour passer une commande, vous devez créer un compte client. Vous êtes responsable de la confidentialité de vos identifiants. Toute activité effectuée depuis votre compte vous est attribuée.</p>
          <p style={{ marginTop: '10px' }}>Piové Cosmetics se réserve le droit de suspendre ou supprimer tout compte en cas d'utilisation abusive ou de non-respect des présentes conditions.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>3. Commandes et paiement</h2>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Les commandes sont confirmées par e-mail après validation.</li>
            <li style={{ marginBottom: '8px' }}>Le paiement s'effectue à la livraison (COD) ou en ligne selon les options disponibles.</li>
            <li style={{ marginBottom: '8px' }}>Les prix affichés sont en Dinars Algériens (DA) et incluent toutes les taxes applicables.</li>
            <li style={{ marginBottom: '8px' }}>Piové Cosmetics se réserve le droit de modifier les prix à tout moment.</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>4. Livraison</h2>
          <p>Nous livrons dans les 58 wilayas d'Algérie. Les délais de livraison sont généralement de 24h à 72h selon votre localisation. La livraison est <strong>gratuite</strong> pour toute commande supérieure à <strong>5000 DA</strong>.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>5. Retours et remboursements</h2>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Vous disposez de <strong>7 jours</strong> après réception pour retourner un produit.</li>
            <li style={{ marginBottom: '8px' }}>Le produit doit être non ouvert, inutilisé et dans son emballage d'origine.</li>
            <li style={{ marginBottom: '8px' }}>Pour des raisons d'hygiène, les produits cosmétiques ouverts ne peuvent être ni repris ni remboursés.</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>6. Propriété intellectuelle</h2>
          <p>Tout le contenu de ce site (images, textes, logos, vidéos) est la propriété exclusive de Piové Cosmetics. Toute reproduction ou utilisation sans autorisation écrite est strictement interdite.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>7. Limitation de responsabilité</h2>
          <p>Piové Cosmetics ne saurait être tenu responsable des dommages indirects résultant de l'utilisation du site ou des produits commandés. Nous faisons notre possible pour assurer l'exactitude des informations publiées.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>8. Droit applicable</h2>
          <p>Les présentes conditions sont régies par le droit algérien. Tout litige sera soumis aux tribunaux compétents d'Alger.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>9. Contact</h2>
          <p>Pour toute question :<br />
          📧 <strong>contact@piovecosmetics.dz</strong><br />
          📞 <strong>0770 26 34 94</strong>
          </p>
        </div>
      </div>
    </main>
  )
}
