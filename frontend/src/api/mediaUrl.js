/**
 * mediaUrl — convertit une URL d'image relative (/media/...) en URL absolue
 * pointant vers le serveur API (api.piovecosmetics.dz).
 *
 * Si l'URL est déjà absolue (http/https) elle est retournée telle quelle.
 * Si l'URL est null/undefined, retourne null.
 */
const API_BASE = (import.meta.env.VITE_API_URL || '')
  .replace(/\/api\/?$/, '')  // retire le suffixe /api pour avoir juste le domaine

export function mediaUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // URL relative comme /media/banners/img.jpg
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

export default mediaUrl
