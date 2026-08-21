import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ProductShare } from './ProductReviews'
import mediaUrl from '../api/mediaUrl'

/** ProductInfo — pricing, variants, actions, description */
const ProductInfo = memo(function ProductInfo({
  product,
  selectedVariant,
  quantity,
  packaging,
  added,
  selectedRelated,
  isB2B,
  isWishlisted,
  onVariantSelect,
  onQuantityChange,
  onPackagingChange,
  onAddToCart,
  onToggleWishlist,
  onRelatedChange,
  // Collection mode props
  isCollection,
  selectedChoices,
  onChoiceSelect,
  allChoicesMade,
}) {
  // Group labels sorted (collection mode only)
  const choiceGroups = useMemo(() => {
    if (!isCollection) return {}
    const groups = {}
    product.variants?.forEach(v => {
      if (v.choice_group) {
        if (!groups[v.choice_group]) groups[v.choice_group] = []
        groups[v.choice_group].push(v)
      }
    })
    return groups
  }, [product.variants, isCollection])

  const groupLabels = useMemo(() =>
    Object.keys(choiceGroups).sort(), [choiceGroups])

  return (
    <div className="product-info">
      {/* Header: category + share */}
      <div className="product-info__header">
        {product.categories?.length > 0 && (
          <p className="product-info__category">
            <Link to={`/${product.categories[0].slug}`}>{product.categories[0].name}</Link>
          </p>
        )}
        <ProductShare product={product} />
      </div>

      <h1 className="product-info__name">{product.name}</h1>

      {/* Rating */}
      {product.avg_rating && (
        <div className="product-info__rating" aria-label={`Note : ${product.avg_rating} sur 5`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(product.avg_rating) ? 'star star--filled' : 'star'} aria-hidden="true">★</span>
          ))}
          <span>{product.avg_rating} ({product.review_count} avis)</span>
        </div>
      )}

      {/* Price */}
      <div className="product-info__pricing">
        {isB2B ? (
          <div className="product-info__b2b-pricing">
            <label className={`b2b-option${packaging === 'boite' ? ' b2b-option--active' : ''}`}>
              <input type="radio" name="packaging" value="boite" checked={packaging === 'boite'} onChange={() => onPackagingChange('boite')} />
              <div className="b2b-option__body">
                <span className="b2b-option__label">Par boîte (Unité)</span>
                <div className="b2b-option__price">
                  {product.b2b_promo_price_box ? (
                    <>
                      <span>{parseFloat(product.b2b_promo_price_box).toLocaleString('fr-DZ')} DA</span>
                      <span className="b2b-option__old">{parseFloat(product.b2b_price_box || product.b2b_price || product.effective_price).toLocaleString('fr-DZ')} DA</span>
                    </>
                  ) : (
                    <span>{parseFloat(product.b2b_price_box || product.b2b_price || product.effective_price).toLocaleString('fr-DZ')} DA</span>
                  )}
                </div>
              </div>
            </label>
            <label className={`b2b-option${packaging === 'carton' ? ' b2b-option--active' : ''}`}>
              <input type="radio" name="packaging" value="carton" checked={packaging === 'carton'} onChange={() => onPackagingChange('carton')} />
              <div className="b2b-option__body">
                <span className="b2b-option__label">Par carton ({product.units_per_carton || 1} pcs)</span>
                <div className="b2b-option__price">
                  {product.b2b_promo_price_carton ? (
                    <>
                      <span>{parseFloat(product.b2b_promo_price_carton).toLocaleString('fr-DZ')} DA</span>
                      <span className="b2b-option__old">{parseFloat(product.b2b_price_carton || product.b2b_price || (product.effective_price * (product.units_per_carton || 1))).toLocaleString('fr-DZ')} DA</span>
                    </>
                  ) : (
                    <span>{parseFloat(product.b2b_price_carton || product.b2b_price || (product.effective_price * (product.units_per_carton || 1))).toLocaleString('fr-DZ')} DA</span>
                  )}
                </div>
              </div>
            </label>
            {product.b2b_min_stock > 1 && (
              <p className="b2b-min-order">Quantité minimale de commande : {product.b2b_min_stock}</p>
            )}
          </div>
        ) : product.is_promo ? (
          <>
            <span className="product-info__price product-info__price--promo">{parseFloat(product.promo_price).toLocaleString('fr-DZ')} DA</span>
            <span className="product-info__price product-info__price--original">{parseFloat(product.price).toLocaleString('fr-DZ')} DA</span>
          </>
        ) : !isCollection && selectedVariant?.price && parseFloat(selectedVariant.price) !== parseFloat(product.price) ? (
          // Variante avec prix VOLONTAIREMENT différent du produit (ex: taille différente)
          <span className="product-info__price">{parseFloat(selectedVariant.price).toLocaleString('fr-DZ')} DA</span>
        ) : (
          // Cas normal : toujours afficher le prix du produit
          <span className="product-info__price">{parseFloat(product.price).toLocaleString('fr-DZ')} DA</span>
        )}
      </div>

      {/* Contenance */}
      {product.contenance && (
        <div className="product-info__contenance">
          {parseFloat(product.contenance).toString().replace('.', ',')}{product.contenance_unit || 'g'}
        </div>
      )}

      {/* Short description */}
      {product.short_description && (
        <p className="product-info__short-desc">{product.short_description}</p>
      )}

      {/* ── COLLECTION MODE: Grouped choices ── */}
      {isCollection && groupLabels.length > 0 && (
        <div className="product-info__collection-choices">
          {groupLabels.map((groupLabel) => {
            const groupVariants = choiceGroups[groupLabel] || []
            const chosen = selectedChoices?.[groupLabel]
            const chosenVariant = groupVariants.find(v => v.id === chosen)
            return (
              <div key={groupLabel} className="collection-choice-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, paddingRight: 15 }}>
                  <p className="collection-choice-group__label" style={{ marginBottom: 10 }}>
                    {groupLabel}
                    {chosenVariant
                      ? <strong> — {chosenVariant.name}</strong>
                      : <span className="collection-choice-group__hint"> — choisissez une teinte</span>
                    }
                  </p>
                  <div className="product-info__swatches" role="radiogroup" aria-label={`Sélectionner ${groupLabel}`}>
                    {groupVariants.filter(v => v.is_available !== false).map((v) => {
                      const rawColor = v.color_hex || '';
                      const useImage = rawColor.includes('|img_on');
                      const hexOnly = rawColor.replace('|img_on', '').replace('|img_off', '');
                      const imgUrl = useImage ? (v.image ? mediaUrl(v.image) : (hexOnly.startsWith('http') ? hexOnly : null)) : null;
                      const isImg = !!imgUrl
                      const code = v.name.split(' ')[0]
                      const isSelected = chosen === v.id
                      return (
                        <button
                          key={v.id}
                          className={`swatch${isSelected ? ' swatch--active' : ''}`}
                          style={{ background: isImg ? '#f0f0f0' : (hexOnly || '#cccccc') }}
                          onClick={() => onChoiceSelect(groupLabel, v)}
                          title={v.name}
                          aria-label={v.name}
                          aria-pressed={isSelected}
                          id={`variant-${v.id}`}
                        >
                          {isImg && (
                            <span className="swatch__code">
                              <img src={imgUrl} alt={code} className="swatch__img" onError={(e) => { e.target.style.display = 'none' }} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {chosenVariant && (() => {
                  const cRaw = chosenVariant.color_hex || '';
                  const cUseImg = cRaw.includes('|img_on');
                  const cHex = cRaw.replace('|img_on', '').replace('|img_off', '');
                  const cImgUrl = cUseImg ? (chosenVariant.image ? mediaUrl(chosenVariant.image) : (cHex.startsWith('http') ? cHex : null)) : null;
                  const cIsImg = !!cImgUrl;
                  return (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: cIsImg ? '#f0f0f0' : (cHex || '#cccccc'), border: '2px solid var(--color-black)', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      {cIsImg && <img src={cImgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={chosenVariant.name} onError={e => e.target.style.display = 'none'} />}
                    </div>
                  )
                })()}
              </div>
            )
          })}
          {!allChoicesMade && (
            <p className="collection-choices-hint">
              ⚠️ Sélectionnez une teinte pour chaque choix pour ajouter au panier.
            </p>
          )}
        </div>
      )}

      {/* ── REGULAR MODE: single variant swatches ── */}
      {!isCollection && product.variants?.length > 0 && (
        <div className="product-info__variants">
          <p className="product-info__variant-label">
            Teinte: <strong>{selectedVariant?.name}</strong>
            {selectedVariant && !selectedVariant.is_available && (
              <span className="variant-unavailable">Indisponible</span>
            )}
          </p>
          <div className="product-info__swatches" role="radiogroup" aria-label="Sélectionner une teinte">
            {product.variants.filter((v) => v.is_available !== false).map((v) => {
              const rawColor = v.color_hex || '';
              const useImage = rawColor.includes('|img_on');
              const hexOnly = rawColor.replace('|img_on', '').replace('|img_off', '');
              const imgUrl = useImage ? (v.image ? mediaUrl(v.image) : (hexOnly.startsWith('http') ? hexOnly : null)) : null;
              const isImg = !!imgUrl
              const code = v.name.split(' ')[0]
              return (
                <button
                  key={v.id}
                  className={`swatch${selectedVariant?.id === v.id ? ' swatch--active' : ''}`}
                  style={{ background: isImg ? '#f0f0f0' : (hexOnly || '#cccccc') }}
                  onClick={() => onVariantSelect(v)}
                  title={v.name}
                  aria-label={v.name}
                  aria-pressed={selectedVariant?.id === v.id}
                  id={`variant-${v.id}`}
                >
                  {isImg && (
                    <span className="swatch__code">
                      <img src={imgUrl} alt={code} className="swatch__img" onError={(e) => { e.target.style.display = 'none' }} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Upsell / related checkboxes */}
      {product.related_products?.length > 0 && (
        <div className="product-info__upsell">
          <h4 className="upsell__title">Produits recommandés avec cet article :</h4>
          <div className="upsell__list">
            {product.related_products.map((rp) => (
              <label key={`upsell-${rp.id}`} className="upsell__item">
                <input
                  type="checkbox"
                  checked={selectedRelated.includes(rp.id)}
                  onChange={(e) => onRelatedChange(rp.id, e.target.checked)}
                />
                {rp.thumbnail && (
                  <img src={rp.thumbnail} alt={rp.name} className="upsell__img" loading="lazy" decoding="async" />
                )}
                <span className="upsell__name">{rp.name}</span>
                <strong className="upsell__price">{Number(rp.effective_price || rp.price).toLocaleString('fr-DZ')} DA</strong>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Qty + Add to cart + Wishlist */}
      <div className="product-info__actions">
        {!isCollection && (
          <div className="product-info__qty" role="group" aria-label="Quantité">
            <button
              onClick={() => onQuantityChange(Math.max(isB2B && product.b2b_min_stock ? product.b2b_min_stock : 1, quantity - 1))}
              aria-label="Diminuer la quantité"
              id="qty-minus"
            >−</button>
            <span aria-live="polite">{quantity}</span>
            <button onClick={() => onQuantityChange(quantity + 1)} aria-label="Augmenter la quantité" id="qty-plus">+</button>
          </div>
        )}
        <button
          className={`btn btn-accent product-info__add-btn${added ? ' added' : ''}`}
          onClick={onAddToCart}
          disabled={isCollection && !allChoicesMade}
          id="add-to-cart-btn"
          aria-label={added ? 'Produit ajouté au panier' : `Ajouter ${product.name} au panier`}
        >
          {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
        </button>
        <button
          className={`product-info__wishlist-btn${isWishlisted ? ' product-info__wishlist-btn--active' : ''}`}
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={isWishlisted}
          id="wishlist-product-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Stock */}
      {!isCollection && product.stock > 0 && (
        <p className="product-info__stock">
          {product.stock > 10
            ? <span className="stock-ok">En stock</span>
            : <span className="stock-low">Plus que {product.stock} en stock</span>
          }
        </p>
      )}

      {/* Description */}
      <div className="product-info__desc">
        <h3>Description</h3>
        <p>{product.description || 'Aucune description disponible.'}</p>
      </div>

      {/* Delivery info */}
      <div className="product-info__delivery">
        <div className="delivery-row">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span>Livraison dans toute l'Algérie</span>
        </div>
        <div className="delivery-row">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span>Paiement à la livraison (COD)</span>
        </div>
        <div className="delivery-row">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h4" strokeLinecap="round"/>
          </svg>
          <span>Paiement en ligne — Edahabia / CIB</span>
          <span className="delivery-badges" aria-hidden="true">
            <span className="delivery-badge delivery-badge--edahabia">EDAHABIA</span>
            <span className="delivery-badge delivery-badge--cib">CIB</span>
          </span>
        </div>
      </div>
    </div>
  )
})

export default ProductInfo
