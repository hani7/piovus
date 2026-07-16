import React, { useState } from 'react'

const FAQ_DATA = [
  {
    question: "Comment puis-je passer une commande ?",
    answer: "Il vous suffit d'ajouter les produits désirés à votre panier, de cliquer sur 'Passer la commande', et de remplir vos informations de livraison. Vous n'avez pas besoin de créer un compte pour commander."
  },
  {
    question: "Quels sont les délais de livraison ?",
    answer: "Les délais varient entre 24h et 72h ouvrables selon votre wilaya de résidence en Algérie."
  },
  {
    question: "Puis-je modifier ma commande après l'avoir validée ?",
    answer: "Oui, si votre commande n'a pas encore été expédiée. Veuillez nous contacter au plus vite par téléphone pour toute modification."
  },
  {
    question: "Vos produits sont-ils originaux ?",
    answer: "Absolument. Nous garantissons que 100% des produits vendus sur Piové Cosmetics sont authentiques et de qualité certifiée."
  }
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <main className="page-enter" style={{ paddingTop: 'calc(var(--navbar-height) + 40px)', paddingBottom: '60px', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', textAlign: 'center' }}>Foire Aux Questions</h1>
        <p style={{ textAlign: 'center', marginBottom: '50px', color: 'var(--color-gray-600)' }}>Trouvez rapidement les réponses à vos questions les plus fréquentes.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {FAQ_DATA.map((faq, index) => (
            <div 
              key={index} 
              style={{ 
                background: '#fff', 
                borderRadius: '8px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                border: '1px solid var(--color-gray-200)',
                overflow: 'hidden'
              }}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                style={{ 
                  width: '100%', 
                  padding: '20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: 'var(--color-gray-900)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {faq.question}
                <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-accent)', transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  +
                </span>
              </button>
              
              {openIndex === index && (
                <div style={{ padding: '0 20px 20px', color: 'var(--color-gray-700)', lineHeight: '1.6', animation: 'fadeIn 0.3s ease' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
