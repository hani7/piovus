import mediaUrl from '../api/mediaUrl'

export default function VariantColorSwatch({ variant, className = '' }) {
  if (!variant) return null

  const rawColor = variant.color_hex || ''
  const useImage = rawColor.includes('|img_on')
  const color = rawColor.replace('|img_on', '').replace('|img_off', '') || '#cccccc'
  const image = useImage
    ? (variant.image ? mediaUrl(variant.image) : (color.startsWith('http') ? color : null))
    : null

  return (
    <span
      className={`variant-color-swatch${className ? ` ${className}` : ''}`}
      style={{ backgroundColor: image ? '#f0f0f0' : color }}
      title={variant.name}
      aria-label={`Couleur choisie : ${variant.name}`}
    >
      {image && <img src={image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
    </span>
  )
}
