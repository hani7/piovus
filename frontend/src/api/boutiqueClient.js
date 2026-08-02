import axios from 'axios'

const boutiqueClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

boutiqueClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('boutique_access_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

boutiqueClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('boutique_refresh_token')
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        const res = await axios.post(`${apiBase}/auth/token/refresh/`, { refresh })
        localStorage.setItem('boutique_access_token', res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return boutiqueClient(original)
      } catch {
        localStorage.removeItem('boutique_access_token')
        localStorage.removeItem('boutique_refresh_token')
        localStorage.removeItem('boutique_user')
        localStorage.removeItem('boutique_info')
        window.location.href = '/boutique/login'
      }
    }
    return Promise.reject(error)
  }
)

export default boutiqueClient
