import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null, // { id, code, discount_amount, discount_type }

      applyCoupon: (couponData) => set({ coupon: couponData }),
      removeCoupon: () => set({ coupon: null }),

      addItem: (product, variant = null, quantity = 1) => {
        const items = get().items
        const key = `${product.id}-${variant?.id || 'default'}`
        const existing = items.find((i) => i.key === key)

        if (existing) {
          set({
            items: items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                key,
                product,
                variant,
                quantity,
                price: (() => {
                  const user = useAuthStore.getState().user;
                  const isB2B = user?.profile?.is_b2b;
                  if (isB2B) {
                    return parseFloat(product.b2b_price || product.effective_price * (product.units_per_carton || 1));
                  }
                  return parseFloat(product.effective_price);
                })(),
              },
            ],
          })
        }
      },

      removeItem: (key) =>
        set({ items: get().items.filter((i) => i.key !== key) }),

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.key !== key) })
        } else {
          set({
            items: get().items.map((i) =>
              i.key === key ? { ...i, quantity } : i
            ),
          })
        }
      },

      clearCart: () => set({ items: [], coupon: null }),

      get total() {
        return get().items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      },

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'piove-cart' }
  )
)
