import re

with open('src/pages/admin/AdminProducts.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_body = """<div className="admin-modal-body" style={{ padding: 0, maxHeight: 'none', overflowY: 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
                  
                  {/* LEFT COLUMN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Informations Générales */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Informations Générales</h3>
                      <div className="form-group">
                        <label>Nom du produit *</label>
                        <input className="form-control" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Brume Corporelle" />
                      </div>
                      <div className="form-group">
                        <label>Petite description <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>(affichée sous la contenance)</span></label>
                        <textarea className="form-control" rows={2} value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} placeholder="Ex: Longue durée, résistant à l'eau..." maxLength={300} style={{ resize: 'vertical', minHeight: '60px' }} />
                        <small style={{ color: 'var(--admin-text-muted)' }}>{(form.short_description || '').length}/300</small>
                      </div>
                      <div className="form-group">
                        <label>Description détaillée</label>
                        <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description complète du produit..." rows={5} />
                      </div>
                    </div>

                    {/* Tarification */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Tarification (B2C & B2B)</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Prix B2C (DA) *</label>
                          <input className="form-control" type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>Prix Promo B2C (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.promo_price} onChange={e => setForm(f => ({ ...f, promo_price: e.target.value }))} placeholder="0.00" />
                        </div>
                      </div>
                      
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '15px', marginBottom: '10px', color: 'var(--admin-text-muted)' }}>Tarification B2B (Revendeurs)</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Prix Unitaire B2B (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_price} onChange={e => setForm(f => ({ ...f, b2b_price: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>Quantité Minimum (MOQ)</label>
                          <input className="form-control" type="number" min="1" value={form.b2b_min_stock} onChange={e => setForm(f => ({ ...f, b2b_min_stock: parseInt(e.target.value) || 1 }))} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Prix par Boîte (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_price_box} onChange={e => setForm(f => ({ ...f, b2b_price_box: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>Promo Boîte (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_promo_price_box} onChange={e => setForm(f => ({ ...f, b2b_promo_price_box: e.target.value }))} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Prix par Carton (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_price_carton} onChange={e => setForm(f => ({ ...f, b2b_price_carton: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>Promo Carton (DA)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.b2b_promo_price_carton} onChange={e => setForm(f => ({ ...f, b2b_promo_price_carton: e.target.value }))} placeholder="0.00" />
                        </div>
                      </div>
                    </div>

                    {/* Stock & Expédition */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Inventaire & Expédition</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Stock actuel *</label>
                          <input className="form-control" type="number" required min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="form-group">
                          <label>Alerte de stock faible</label>
                          <input className="form-control" type="number" min="0" value={form.min_stock_alert} onChange={e => setForm(f => ({ ...f, min_stock_alert: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Poids Boîte (Kg)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.weight_box} onChange={e => setForm(f => ({ ...f, weight_box: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                          <label>Poids Carton (Kg)</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.weight_carton} onChange={e => setForm(f => ({ ...f, weight_carton: e.target.value }))} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Valeur (ex: 50, 100)</label>
                          <input className="form-control" type="text" value={form.contenance} onChange={e => setForm(f => ({ ...f, contenance: e.target.value }))} placeholder="Valeur contenance" />
                        </div>
                        <div className="form-group">
                          <label>Unité de mesure</label>
                          <select className="form-control" value={form.contenance_unit} onChange={e => setForm(f => ({ ...f, contenance_unit: e.target.value }))}>
                            <option value="g">g (Grammes)</option>
                            <option value="kg">Kg (Kilogrammes)</option>
                            <option value="ml">ml (Millilitres)</option>
                            <option value="l">L (Litres)</option>
                            <option value="oz">oz (Onces)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contenus Avancés (Variations, Galerie, Similaires) */}
                    {editId && (
                      <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Extensions du Produit</h3>
                        
                        {/* Variations */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Variations (Teintes / Couleurs)</h4>
                          <button type="button" className="btn-secondary" onClick={() => setShowVariants(!showVariants)}>
                            {showVariants ? 'Masquer' : 'Gérer les variations'}
                          </button>
                        </div>
                        {showVariants && (
                          <div className="variants-section" style={{ background: 'var(--admin-surface2)', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                              <button type="button" className="btn-secondary" onClick={() => setForm(f => ({ ...f, is_collection: !f.is_collection }))} style={{ flex: 1, justifyContent: 'center' }}>
                                Mode actuel: <strong>{form.is_collection ? 'Collection (Multi-Choix)' : 'Normal (Choix Unique)'}</strong>
                              </button>
                            </div>
                            
                            {variants.map(v => (
                              <div key={v.id} style={{ background: 'var(--admin-surface)', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid var(--admin-border)' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.color_hex?.includes('|img_on') ? '#f0f0f0' : (v.color_hex?.replace('|img_on','').replace('|img_off','') || '#fff') }}>
                                  {v.color_hex?.includes('|img_on') && v.image ? <img src={mediaUrl(v.image)} alt="var" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (v.color_hex?.includes('|img_on') && v.color_hex?.replace('|img_on','').replace('|img_off','').startsWith('http') ? <img src={v.color_hex.replace('|img_on','').replace('|img_off','')} alt="var" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null)}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Prix: {v.price || 'Par défaut'} {form.is_collection && v.group_name ? ` | Groupe: ${v.group_name}` : ''}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => startEditVariant(v)}>Modifier</button>
                                  <button type="button" className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteVariant(v.id)}>Supprimer</button>
                                </div>
                              </div>
                            ))}

                            <div style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: '20px', marginTop: '10px' }}>
                              <h4 style={{ fontSize: '1rem', marginBottom: '15px' }}>{editVariantId ? 'Modifier la variation' : 'Ajouter une variation'}</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Nom de la variation *</label>
                                  <input className="form-control" value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} placeholder="Ex: Rouge, S, etc." />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Groupe (pour Collections)</label>
                                  <input className="form-control" value={variantForm.group_name} onChange={e => setVariantForm({ ...variantForm, group_name: e.target.value })} placeholder="Ex: Choix 01" disabled={!form.is_collection} />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Couleur (Code Hex)</label>
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="color" style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} value={variantForm.color_hex.replace('|img_on','').replace('|img_off','') || '#cccccc'} onChange={e => {
                                      const suffix = variantForm.color_hex.includes('|img_on') ? '|img_on' : (variantForm.color_hex.includes('|img_off') ? '|img_off' : '');
                                      setVariantForm({ ...variantForm, color_hex: e.target.value + suffix })
                                    }} />
                                    <input className="form-control" value={variantForm.color_hex.replace('|img_on','').replace('|img_off','') || ''} onChange={e => {
                                      const suffix = variantForm.color_hex.includes('|img_on') ? '|img_on' : (variantForm.color_hex.includes('|img_off') ? '|img_off' : '');
                                      setVariantForm({ ...variantForm, color_hex: e.target.value + suffix })
                                    }} placeholder="#RRGGBB ou URL Image" style={{ flex: 1 }} />
                                  </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Image de variation</label>
                                  <input type="file" accept="image/*" className="form-control" style={{ padding: '8px' }} ref={variantFileRef} onChange={e => setVariantFile(e.target.files[0])} />
                                </div>
                              </div>
                              <div style={{ marginTop: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                  <input type="checkbox" checked={variantForm.color_hex.includes('|img_on')} onChange={e => {
                                    const base = variantForm.color_hex.replace('|img_on','').replace('|img_off','');
                                    setVariantForm({ ...variantForm, color_hex: base + (e.target.checked ? '|img_on' : '|img_off') });
                                  }} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Utiliser l'image comme vignette de couleur</span>
                                </label>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Prix spécifique (Optionnel)</label>
                                  <input className="form-control" type="number" step="0.01" value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} placeholder="Laissez vide pour le prix par défaut" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Stock (Optionnel)</label>
                                  <input className="form-control" type="number" value={variantForm.stock} onChange={e => setVariantForm({ ...variantForm, stock: e.target.value })} placeholder="Vide = stock global" />
                                </div>
                              </div>
                              <div style={{ marginTop: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                  <input type="checkbox" checked={variantForm.is_available} onChange={e => setVariantForm({ ...variantForm, is_available: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Disponible à la vente</span>
                                </label>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn-primary" onClick={handleSaveVariant} disabled={!variantForm.name || saving}>
                                  {saving ? 'Enregistrement...' : (editVariantId ? 'Mettre à jour' : 'Ajouter')}
                                </button>
                                {editVariantId && (
                                  <button type="button" className="btn-secondary" onClick={cancelEditVariant}>Annuler modification</button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Galerie */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Galerie (Images & Vidéos)</h4>
                          <button type="button" className="btn-secondary" onClick={() => setShowGallery(!showGallery)}>
                            {showGallery ? 'Masquer' : 'Gérer la galerie'}
                          </button>
                        </div>
                        {showGallery && (
                          <div className="gallery-section" style={{ background: 'var(--admin-surface2)', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                            {gallery.length > 0 ? (
                              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {gallery.map(g => (
                                  <div key={g.id} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                                    {g.video ? (
                                      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                                        {g.image && <img src={mediaUrl(g.image)} alt="poster" style={{ opacity: 0.6 }} />}
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#333"><polygon points="5,3 19,12 5,21"/></svg>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={mediaUrl(g.image)} alt="galerie" />
                                    )}
                                    <button type="button" className="btn-danger" style={{ position: 'absolute', top: 5, right: 5, padding: '2px 5px', fontSize: '0.7rem' }} onClick={() => handleDeleteGallery(g.id)}>X</button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'var(--admin-text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Aucun média dans la galerie.</p>
                            )}
                            <div style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: '15px' }}>
                              <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Ajouter un média</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Image (Miniature/Poster)</label>
                                  <input type="file" accept="image/*" className="form-control" style={{ padding: '8px' }} ref={galleryImageRef} onChange={e => setGalleryImageFile(e.target.files[0])} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label>Vidéo (Optionnel, MP4)</label>
                                  <input type="file" accept="video/mp4,video/webm" className="form-control" style={{ padding: '8px' }} ref={galleryVideoRef} onChange={e => setGalleryVideoFile(e.target.files[0])} />
                                </div>
                              </div>
                              <button type="button" className="btn-primary" style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }} onClick={handleSaveGallery} disabled={(!galleryImageFile && !galleryVideoFile) || saving}>
                                {saving ? 'Ajout en cours...' : 'Ajouter à la galerie'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Produits Similaires */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Produits Similaires</h4>
                          <button type="button" className="btn-secondary" onClick={() => setShowRelated(!showRelated)}>
                            {showRelated ? 'Masquer' : 'Gérer les produits similaires'}
                          </button>
                        </div>
                        {showRelated && (
                          <div className="related-section" style={{ background: 'var(--admin-surface2)', padding: '20px', borderRadius: '8px' }}>
                            {relatedProducts.length > 0 ? (
                              <div style={{ display: 'grid', gap: '10px', marginBottom: '15px' }}>
                                {relatedProducts.map(rp => (
                                  <div key={`rp-${rp.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--admin-surface)', padding: '10px', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                      {rp.thumbnail ? (
                                        <img src={mediaUrl(rp.thumbnail)} alt={rp.name} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                                      ) : (
                                        <div style={{ width: '30px', height: '30px', background: 'var(--admin-border)', borderRadius: '4px' }} />
                                      )}
                                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{rp.name}</div>
                                    </div>
                                    <button type="button" className="btn-action-icon text-danger" onClick={() => setRelatedProducts(relatedProducts.filter(r => r.id !== rp.id))}>
                                      <X size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'var(--admin-text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Aucun produit similaire sélectionné.</p>
                            )}

                            {relatedProducts.length < 5 && (
                              <div style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: '15px' }}>
                                <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Rechercher un produit à ajouter</h4>
                                <input 
                                  className="form-control" 
                                  placeholder="Rechercher par nom..." 
                                  value={relatedSearch} 
                                  onChange={e => setRelatedSearch(e.target.value)}
                                  style={{ marginBottom: '10px' }}
                                />
                                {relatedSearch && (
                                  <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
                                    {products.filter(p => p.id !== editId && !relatedProducts.some(rp => rp.id === p.id) && p.name.toLowerCase().includes(relatedSearch.toLowerCase())).slice(0, 10).map(p => (
                                      <div key={`search-${p.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--admin-border)' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                                        <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => {
                                          setRelatedProducts([...relatedProducts, p])
                                          setRelatedSearch('')
                                        }}>Ajouter</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {relatedProducts.length >= 5 && (
                              <p style={{ color: 'var(--admin-warning)', fontSize: '0.85rem', marginTop: '10px' }}>Limite de 5 produits similaires atteinte.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Statut & Visibilité */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Statut & Visibilité</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Actif (Publié)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Mis en avant (Vedette)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Nouveauté</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={form.is_bestseller} onChange={e => setForm(f => ({ ...f, is_bestseller: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Best Seller</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={form.is_promotion} onChange={e => setForm(f => ({ ...f, is_promotion: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Promotion</span>
                        </label>
                      </div>
                    </div>

                    {/* Image Principale */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Image Principale</h3>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        {thumbPreview ? (
                          <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--admin-border)', marginBottom: '15px' }}>
                            <img src={thumbPreview} alt="preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '100%', paddingBottom: '100%', borderRadius: '8px', border: '2px dashed var(--admin-border)', background: 'var(--admin-surface2)', marginBottom: '15px', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', flexDirection: 'column', gap: '10px' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span>Aucune image</span>
                            </div>
                          </div>
                        )}
                        <label className="btn-secondary" htmlFor="thumb-upload" style={{ display: 'flex', width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          {thumbPreview ? "Remplacer l'image" : 'Sélectionner une image'}
                        </label>
                        <input id="thumb-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumb} ref={fileRef} />
                      </div>
                    </div>

                    {/* Organisation */}
                    <div className="admin-card" style={{ padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>Organisation</h3>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Catégories</label>
                        <select multiple className="form-control" style={{ height: '160px', padding: '10px' }} value={form.category_ids} onChange={e => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setForm(f => ({ ...f, category_ids: values }))
                        }}>
                          {categories.map(c => <option key={c.id} value={c.id} style={{ padding: '8px', borderBottom: '1px solid var(--admin-border)' }}>{c.name}</option>)}
                        </select>
                        <small style={{color: 'var(--admin-text-muted)', display: 'block', marginTop: '10px'}}>Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs catégories.</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STICKY ACTIONS BAR (Bottom Right) */}
                <div style={{ position: 'sticky', bottom: '24px', display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '40px', padding: '20px 0', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg)', zIndex: 50 }}>
                  <button type="button" className="btn-secondary" onClick={() => setModal(null)} style={{ padding: '12px 24px', fontSize: '1rem', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <X size={18} style={{ marginRight: '8px' }} /> Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)' }}>
                    <Save size={18} style={{ marginRight: '8px' }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
"""

start_str = '<div className="admin-modal-body" style={{ padding: 0, maxHeight: \'none\', overflowY: \'visible\' }}>'
end_str = '</form>'

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_body + content[end_idx:]
    with open('src/pages/admin/AdminProducts.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Failed to find start or end strings')
