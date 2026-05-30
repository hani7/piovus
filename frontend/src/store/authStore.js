import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login as apiLogin, verifyOTP as apiVerifyOTP, register as apiRegister, registerB2B as apiRegisterB2B, logout as apiLogout } from '../api/auth'

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
          
          if (res.data.mfa_required) {
            set({ isLoading: false })
            return { success: true, mfa_required: true, user_id: res.data.user_id }
          }

          localStorage.setItem('access_token', res.data.access)
          localStorage.setItem('refresh_token', res.data.refresh)
          set({
            user: res.data.user,
            accessToken: res.data.access,
            refreshToken: res.data.refresh,
            isLoading: false,
          })
          return { success: true, mfa_required: false }
        } catch (err) {
          const msg = err.response?.data?.error || 'Identifiants invalides'
          set({ isLoading: false, error: msg })
          return { success: false, error: msg }
        }
      },

      verifyOTP: async (user_id, otp) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiVerifyOTP({ user_id, otp })
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
          const msg = err.response?.data?.error || 'Code invalide'
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

      registerB2B: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiRegisterB2B(data)
          localStorage.setItem('access_token', res.data.access)
          localStorage.setItem('refresh_token', res.data.refresh)
          set({
            user: res.data.user,
            accessToken: res.data.access,
            refreshToken: res.data.refresh,
            isLoading: false,
          })
          return { success: true, message: res.data.message }
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

      socialLoginAction: async (provider, token) => {
        set({ isLoading: true, error: null })
        try {
          const res = await import('../api/auth').then(m => m.socialLogin(provider, token))
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
          const msg = err.response?.data?.error || `Erreur de connexion via ${provider}`
          set({ isLoading: false, error: msg })
          return { success: false, error: msg }
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'piove-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }) }
  )
)
