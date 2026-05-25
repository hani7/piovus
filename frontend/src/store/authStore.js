import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiLogin({ username, password })
          localStorage.setItem('access_token', res.data.access)
          localStorage.setItem('refresh_token', res.data.refresh)
          set({
            user: res.data.user,
            accessToken: res.data.access,
            refreshToken: res.data.refresh,
            isLoading: false,
          })
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.error || 'Identifiants invalides'
          set({ isLoading: false, error: msg })
          return { success: false, error: msg }
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiRegister(data)
          localStorage.setItem('access_token', res.data.access)
          localStorage.setItem('refresh_token', res.data.refresh)
          set({
            user: res.data.user,
            accessToken: res.data.access,
            refreshToken: res.data.refresh,
            isLoading: false,
          })
          return { success: true }
        } catch (err) {
          const errors = err.response?.data || {}
          const msg = Object.values(errors).flat().join(' ')
          set({ isLoading: false, error: msg })
          return { success: false, error: msg }
        }
      },

      logout: async () => {
        try {
          const refresh = get().refreshToken
          if (refresh) await apiLogout(refresh)
        } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'piove-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }) }
  )
)
