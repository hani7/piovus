import React from 'react'

export default function ContactPage() {
  return (
    <main className="page-enter" style={{ padding: '60px 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', textAlign: 'center' }}>Contactez-nous</h1>
        
        <p style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.1rem', color: 'var(--color-gray-700)' }}>
          Une question ? Besoin d'aide avec votre commande ? Notre équipe est là pour vous répondre.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '50px' }}>
          
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📍</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Notre Adresse</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '15px', lineHeight: '1.6' }}>N°29/A Zone d’activités<br/>Zeralda, Alger</p>
          </div>

          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📞</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Par Téléphone</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '15px' }}>Du Samedi au Jeudi, de 9h à 18h</p>
            <a href="tel:+213770263494" style={{ fontWeight: 'bold', color: 'var(--color-accent)', fontSize: '1.2rem' }}>0770 26 34 94</a>
          </div>

          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>✉️</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Par Email</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '15px' }}>Nous répondons sous 24h</p>
            <a href="mailto:contact@piovecosmetics.dz" style={{ fontWeight: 'bold', color: 'var(--color-accent)', fontSize: '1.1rem' }}>contact@piovecosmetics.dz</a>
          </div>

        </div>

        <div style={{ background: 'var(--color-gray-50)', padding: '40px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Envoyez-nous un message</h2>
          <form action="mailto:contact@piovecosmetics.dz" method="POST" encType="text/plain" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <input type="text" name="Nom" placeholder="Votre nom" required style={{ flex: '1 1 calc(50% - 15px)', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
              <input type="email" name="Email" placeholder="Votre email" required style={{ flex: '1 1 calc(50% - 15px)', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </div>
            <input type="text" name="Sujet" placeholder="Sujet" required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
            <textarea name="Message" placeholder="Votre message..." rows="5" required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', resize: 'vertical' }}></textarea>
            <button type="submit" className="btn btn-accent" style={{ alignSelf: 'flex-start', padding: '12px 30px' }}>
              Envoyer le message
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
