import React from 'react'

export default function MaintenancePage({ message }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#fff',
      textAlign: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '2px',
          margin: 0
        }}>
          PIOVÉ
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '3px', marginTop: '4px' }}>
          Cosmetics
        </p>
      </div>

      <div style={{
        maxWidth: '500px',
        background: 'var(--color-gray-50)',
        border: '1px solid var(--color-gray-200)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ width: '48px', height: '48px', margin: '0 auto 20px', display: 'block' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: '16px' }}>
          Site en Maintenance
        </h2>
        
        <p style={{ fontSize: '1rem', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
          {message || "Nous mettons actuellement à jour notre site web pour mieux vous servir. Nous serons de retour très bientôt."}
        </p>
      </div>

      <p style={{ marginTop: '40px', fontSize: '0.85rem', color: 'var(--color-gray-400)' }}>
        © {new Date().getFullYear()} Piové Cosmetics. Tous droits réservés.
      </p>
    </div>
  )
}
