import React from 'react'

export default function PrivacyPage() {
  return (
    <main className="page-enter" style={{ paddingTop: 'calc(var(--navbar-height) + 40px)', paddingBottom: '60px', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textAlign: 'center' }}>Politique de Confidentialité</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', marginBottom: '40px', fontSize: '0.9rem' }}>
          Dernière mise à jour : Juillet 2026
        </p>

        <div style={{ lineHeight: '1.9', fontSize: '1rem', color: 'var(--color-gray-700)' }}>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>1. Collecte des informations</h2>
          <p>Nous collectons les informations que vous nous fournissez lors de la création de votre compte, de vos commandes ou de l'utilisation de nos services :</p>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Nom, prénom, adresse e-mail, numéro de téléphone</li>
            <li style={{ marginBottom: '8px' }}>Adresse de livraison</li>
            <li style={{ marginBottom: '8px' }}>Informations de connexion (nom d'utilisateur)</li>
            <li style={{ marginBottom: '8px' }}>Données de navigation et d'utilisation du site</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>2. Utilisation des données</h2>
          <p>Vos données personnelles sont utilisées pour :</p>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Traiter et expédier vos commandes</li>
            <li style={{ marginBottom: '8px' }}>Gérer votre compte client</li>
            <li style={{ marginBottom: '8px' }}>Vous envoyer des notifications relatives à vos commandes</li>
            <li style={{ marginBottom: '8px' }}>Améliorer notre service et personnaliser votre expérience</li>
            <li style={{ marginBottom: '8px' }}>Vous informer de nos offres et promotions (avec votre consentement)</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>3. Connexion via Google</h2>
          <p>Si vous choisissez de vous connecter via votre compte Google, nous recevons uniquement votre nom, adresse e-mail et photo de profil publique. Nous n'accédons pas à vos autres données Google. Ces informations sont utilisées uniquement pour créer et gérer votre compte Piové Cosmetics.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>4. Partage des données</h2>
          <p>Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos informations peuvent être partagées uniquement avec :</p>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Nos partenaires de livraison pour l'expédition de vos commandes</li>
            <li style={{ marginBottom: '8px' }}>Les autorités compétentes si la loi l'exige</li>
          </ul>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>5. Sécurité</h2>
          <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>6. Vos droits</h2>
          <p>Vous disposez des droits suivants concernant vos données personnelles :</p>
          <ul style={{ paddingLeft: '24px', marginTop: '10px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Droit d'accès à vos données</li>
            <li style={{ marginBottom: '8px' }}>Droit de rectification</li>
            <li style={{ marginBottom: '8px' }}>Droit à l'effacement (droit à l'oubli)</li>
            <li style={{ marginBottom: '8px' }}>Droit d'opposition au traitement</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous à : <strong>contact@piovecosmetics.dz</strong></p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>7. Cookies</h2>
          <p>Notre site utilise des cookies pour améliorer votre expérience de navigation. Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités du site pourraient ne plus être disponibles.</p>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '32px', marginBottom: '12px', color: '#000' }}>8. Contact</h2>
          <p>Pour toute question relative à cette politique de confidentialité :<br />
          📧 <strong>contact@piovecosmetics.dz</strong><br />
          📞 <strong>0770 26 34 94</strong>
          </p>
        </div>
      </div>
    </main>
  )
}
