import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import adminClient from '../../api/adminClient'
import { Search, FileText, Package, ShoppingCart } from 'lucide-react'
import { NAV_ITEMS } from './AdminLayout'

export default function CommandMenu({ isOpen, setIsOpen }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ pages: [], products: [], orders: [] })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50)
      setQuery('')
      setResults({ pages: [], products: [], orders: [] })
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults({ pages: [], products: [], orders: [] })
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      try {
        const lowerQuery = query.toLowerCase()
        const pages = []
        NAV_ITEMS.forEach(section => {
          section.links.forEach(link => {
            if (link.label.toLowerCase().includes(lowerQuery)) {
              pages.push({ ...link, section: section.section })
            }
          })
        })

        const [prodRes, ordRes] = await Promise.all([
          adminClient.get(`/admin/products/?search=${encodeURIComponent(query)}&page_size=5`),
          adminClient.get(`/admin/orders/?search=${encodeURIComponent(query)}&page_size=5`)
        ])

        setResults({
          pages: pages.slice(0, 5),
          products: prodRes.data.results || prodRes.data || [],
          orders: ordRes.data.results || ordRes.data || []
        })
        setSelectedIndex(0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const debounceId = setTimeout(fetchResults, 300)
    return () => clearTimeout(debounceId)
  }, [query])

  const allItems = [
    ...results.pages.map(p => ({ type: 'page', ...p })),
    ...results.products.map(p => ({ type: 'product', ...p })),
    ...results.orders.map(o => ({ type: 'order', ...o }))
  ]

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex])
      } else if (query.trim()) {
        navigate(`/piove-secure-2026/orders?search=${encodeURIComponent(query)}`)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleSelect = (item) => {
    if (item.type === 'page') {
      navigate(item.to)
    } else if (item.type === 'product') {
      navigate(`/piove-secure-2026/products?search=${encodeURIComponent(item.name)}`)
    } else if (item.type === 'order') {
      navigate(`/piove-secure-2026/orders/${item.id}`)
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="command-menu-overlay" onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
      <div className="command-menu-modal">
        <div className="command-menu-header">
          <Search size={20} color="var(--admin-text-muted)" />
          <input 
            ref={inputRef}
            className="command-menu-input"
            placeholder="Rechercher produits, commandes, pages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {query.trim() && (
          <div className="command-menu-results">
            {loading && <div className="command-menu-loading">Recherche en cours...</div>}
            
            {!loading && allItems.length === 0 && (
              <div className="command-menu-empty">Aucun rÃ©sultat trouvÃ© pour "{query}"</div>
            )}

            {!loading && allItems.length > 0 && (
              <>
                {results.pages.length > 0 && <div className="command-menu-section-title">Pages</div>}
                {results.pages.map((p) => {
                  const globalIdx = allItems.findIndex(x => x.type === 'page' && x.to === p.to)
                  return (
                    <div 
                      key={p.to} 
                      className={`command-menu-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                      onClick={() => handleSelect({ type: 'page', ...p })}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <FileText size={16} />
                      <div className="command-menu-item-text">
                        <span>{p.label}</span>
                        <span className="command-menu-item-muted">{p.section}</span>
                      </div>
                    </div>
                  )
                })}

                {results.products.length > 0 && <div className="command-menu-section-title">Produits</div>}
                {results.products.map((p) => {
                  const globalIdx = allItems.findIndex(x => x.type === 'product' && x.id === p.id)
                  return (
                    <div 
                      key={p.id} 
                      className={`command-menu-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                      onClick={() => handleSelect({ type: 'product', ...p })}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <Package size={16} />
                      <div className="command-menu-item-text">
                        <span>{p.name}</span>
                        <span className="command-menu-item-muted">{p.stock} en stock</span>
                      </div>
                    </div>
                  )
                })}

                {results.orders.length > 0 && <div className="command-menu-section-title">Commandes</div>}
                {results.orders.map((o) => {
                  const globalIdx = allItems.findIndex(x => x.type === 'order' && x.id === o.id)
                  return (
                    <div 
                      key={o.id} 
                      className={`command-menu-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                      onClick={() => handleSelect({ type: 'order', ...o })}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <ShoppingCart size={16} />
                      <div className="command-menu-item-text">
                        <span>Commande #{o.id}</span>
                        <span className="command-menu-item-muted">{o.customer_name || o.customer_phone}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

