import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [], // array of product objects

      toggle: (product) => {
        const exists = get().items.some(p => p.id === product.id)
        if (exists) {
          set({ items: get().items.filter(p => p.id !== product.id) })
        } else {
          set({ items: [...get().items, product] })
        }
      },

      isWishlisted: (productId) => get().items.some(p => p.id === productId),

      remove: (productId) => set({ items: get().items.filter(p => p.id !== productId) }),

      clear: () => set({ items: [] }),
    }),
    { name: 'piove-wishlist' }
  )
)
