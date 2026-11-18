import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login as apiLogin, verifyOTP as apiVerifyOTP, register as apiRegister, registerB2B as apiRegisterB2B, logout as apiLogout } from '../api/auth'

const stripHtml = (value) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const toErrorMessage = (err, fallback) => {
  const status = err?.response?.status
  const data = err?.response?.data

  const raw = (() => {
    if (!data) return null

    if (typeof data === 'string') return data

    if (typeof data === 'object') {
      const preferred = data.error || data.detail || data.message
      if (typeof preferred === 'string' && preferred.trim()) return preferred

      const values = Object.values(data)
      const flattened = values.flatMap((value) => (Array.isArray(value) ? value : [value]))
      const firstString = flattened.find((value) => typeof value === 'string' && value.trim())
      if (firstString) return firstString
    }

    return null
  })()

  const cleaned = typeof raw === 'string' ? stripHtml(raw) : ''

  if (cleaned) {
    if (status >= 500 && /server\s*error/i.test(cleaned)) {
      return "Une erreur serveur est survenue. Veuillez réessayer plus tard."
    }
    return cleaned
  }

  if (status >= 500) {
    return "Une erreur serveur est survenue. Veuillez réessayer plus tard."
  }

  return fallback
}

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
          const msg = toErrorMessage(err, 'Identifiants invalides')
          set({ isLoading: false, error: msg })
          return { success: false, error: msg, code: err.response?.data?.code }
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
          const msg = toErrorMessage(err, 'Code invalide')
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
          const msg = toErrorMessage(err, "Erreur lors de l'inscription")
          set({ isLoading: false, error: msg })
          return { success: false, error: msg }
        }
      },

      registerB2B: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiRegisterB2B(data)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
          })
          return { success: true, code: res.data.code, message: res.data.message }
        } catch (err) {
          const msg = toErrorMessage(err, "Erreur lors de la demande d'accès")
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
          const msg = toErrorMessage(err, `Erreur de connexion via ${provider}`)
          set({ isLoading: false, error: msg })
          return { success: false, error: msg, code: err.response?.data?.code }
        }
      },

      clearError: () => set({ error: null }),

      refreshUser: async () => {
        try {
          const { getProfile } = await import('../api/auth')
          const res = await getProfile()
          set((state) => ({ user: { ...state.user, ...res.data } }))
        } catch {}
      },

    }),
    { name: 'piove-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }) }
  )
)
