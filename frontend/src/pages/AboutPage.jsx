import React from 'react'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <main className="page-enter" style={{ paddingTop: 'calc(var(--navbar-height) + 40px)', paddingBottom: '60px', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', textAlign: 'center' }}>À Propos de Piové Cosmetics</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--color-gray-800)' }}>
          <p style={{ marginBottom: '20px' }}>
            Bienvenue chez <strong>Piové Cosmetics</strong>, votre destination beauté en ligne en Algérie. 
            Nous sommes passionnés par le maquillage et les soins de la peau, et notre mission est de vous offrir des produits de haute qualité à des prix accessibles.
          </p>
          
          <p style={{ marginBottom: '20px' }}>
            Fondée avec la volonté de sublimer la beauté de chacun, notre marque sélectionne avec soin les meilleurs ingrédients et formules pour garantir des résultats exceptionnels. Que vous recherchiez les dernières tendances en matière de rouges à lèvres, des fonds de teint parfaits ou des soins nourrissants, Piové Cosmetics est là pour répondre à tous vos besoins.
          </p>

          <div style={{ background: 'var(--color-gray-100)', padding: '30px', borderRadius: '12px', marginTop: '40px', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Nos Valeurs</h3>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '10px' }}>✨ <strong>Qualité Premium</strong> : Des formulations sûres et efficaces.</li>
              <li style={{ marginBottom: '10px' }}>✨ <strong>Authenticité</strong> : 100% de nos produits sont originaux et certifiés.</li>
              <li style={{ marginBottom: '10px' }}>✨ <strong>Service Client</strong> : Votre satisfaction est notre priorité absolue.</li>
            </ul>
          </div>

          <p style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/shop" className="btn btn-accent" style={{ display: 'inline-flex', padding: '12px 30px', fontSize: '1.1rem' }}>
              Découvrir nos produits
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
