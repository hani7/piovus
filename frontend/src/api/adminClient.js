import axios from 'axios'

const adminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_access_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
adminClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('admin_refresh_token')
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        const res = await axios.post(`${apiBase}/auth/token/refresh/`, { refresh })
        localStorage.setItem('admin_access_token', res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return adminClient(original)
      } catch {
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
        localStorage.removeItem('admin_user')
        window.location.href = '/admin-panel/login'
      }
    }
    return Promise.reject(error)
  }
)

export default adminClient
