import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Piové Cosmetics'
const DEFAULT_IMAGE = 'https://piovecosmetics.com/og-image.jpg'
const BASE_URL = 'https://piovecosmetics.com'

/**
 * PageSEO — Drop-in component for per-page meta tags
 *
 * Usage:
 * <PageSEO title="Makeup Fixer Spray" description="..." image={product.thumbnail} />
 */
export default function PageSEO({
  title,
  description = 'Piové Cosmetics — Boutique beauté en ligne. Maquillage et soins de qualité, livraison dans toute l\'Algérie.',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} | Beauté & Maquillage en Algérie`
  const canonicalUrl = url ? `${BASE_URL}${url}` : undefined

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image || DEFAULT_IMAGE} />
      <meta property="og:type" content={type} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || DEFAULT_IMAGE} />
    </Helmet>
  )
}
