import { memo, useState, useEffect } from 'react'
import mediaUrl from '../api/mediaUrl'

/** ProductGallery — image/video carousel with thumbnail strip */
const ProductGallery = memo(function ProductGallery({
  product,
  images,
  selectedImage,
  selectedVariant,
  onSelectImage,
}) {
  const [imgError, setImgError] = useState(false)

  // Reset l'erreur si l'image sélectionnée change
  useEffect(() => {
    setImgError(false)
  }, [selectedImage, selectedVariant])

  const renderPlaceholder = () => (
    <div className="product-gallery__placeholder">
      <svg width="60" height="60" fill="none" stroke="var(--color-gray-300)" strokeWidth="1.2" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  )

  const showPlaceholder = imgError || (images.length === 0 && !selectedVariant?.image)

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {!showPlaceholder ? (
          <>
            {selectedImage === -1 && selectedVariant?.image ? (
              <img 
                src={mediaUrl(selectedVariant.image)} 
                alt={selectedVariant.name} 
                loading="lazy" 
                decoding="async" 
                onError={() => setImgError(true)}
              />
            ) : images[selectedImage]?.video ? (
              <video
                key={images[selectedImage].video}
                src={images[selectedImage].video + '#t=0.001'}
                poster={mediaUrl(images[selectedImage].image) || undefined}
                controls
                preload="auto"
                playsInline
                className="product-gallery__video"
                onError={() => setImgError(true)}
              />
            ) : (
              <img
                src={mediaUrl(images[selectedImage]?.image) || mediaUrl(product.thumbnail)}
                alt={images[selectedImage]?.alt || product.name}
                loading="eager"
                decoding="async"
                onError={() => setImgError(true)}
              />
            )}
            {images.length > 1 && selectedImage !== -1 && (
              <>
                <button
                  className="carousel-btn prev"
                  aria-label="Image précédente"
                  onClick={() => onSelectImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1)}
                >‹</button>
                <button
                  className="carousel-btn next"
                  aria-label="Image suivante"
                  onClick={() => onSelectImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0)}
                >›</button>
              </>
            )}
          </>
        ) : renderPlaceholder()}
        
        <div className="product-gallery__badges">
          {product.is_promo && (
            <span className="badge badge-promo">
              Promo -{Math.round((1 - product.promo_price / product.price) * 100)}%
            </span>
          )}
          {product.is_new && <span className="badge badge-new">Nouveau</span>}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="product-gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              className={`product-gallery__thumb ${i === selectedImage ? 'active' : ''}`}
              onClick={() => onSelectImage(i)}
              id={`thumb-${i}`}
              aria-label={`Image ${i + 1}`}
            >
              {img.video && !img.image ? (
                <div className="thumb-video-placeholder">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>
                  <span>VIDÉO</span>
                </div>
              ) : (
                <>
                  <img 
                    src={mediaUrl(img.image)} 
                    alt={img.alt || product.name} 
                    loading="lazy" 
                    decoding="async" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {img.video && (
                    <div className="thumb-video-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default ProductGallery
