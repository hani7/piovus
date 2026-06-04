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

      addItem: (product, variant = null, quantity = 1, packaging = 'boite') => {
        const items = get().items
        const key = `${product.id}-${variant?.id || 'default'}-${packaging}`
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
                packaging,
                price: (() => {
                  const user = useAuthStore.getState().user;
                  const isB2B = user?.profile?.is_b2b;
                  if (isB2B) {
                    if (packaging === 'carton') {
                      return parseFloat(product.b2b_promo_price_carton || product.b2b_price_carton || product.b2b_price || product.effective_price * (product.units_per_carton || 1));
                    } else {
                      return parseFloat(product.b2b_promo_price_box || product.b2b_price_box || product.b2b_price || product.effective_price);
                    }
                  }
                  return parseFloat(product.effective_price);
                })(),
                weight: (() => {
                  const user = useAuthStore.getState().user;
                  const isB2B = user?.profile?.is_b2b;
                  if (isB2B) {
                    if (packaging === 'carton') return parseFloat(product.weight_carton || 0);
                    return parseFloat(product.weight_box || 0);
                  }
                  return 0; // Not used for retail currently
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
