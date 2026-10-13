import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
    delete config.headers['content-type']
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
      config.headers.delete('content-type')
    }
  }
  return config
})

// Auto-refresh on 401
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.data?.code === 'b2b_pending') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('piove-auth')
      if (window.location.pathname !== '/compte/en-attente') {
        window.location.href = '/compte/en-attente'
      }
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        const res = await axios.post(`${apiBase}/auth/token/refresh/`, { refresh })
        localStorage.setItem('access_token', res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return client(original)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('piove-auth')
        window.location.href = refreshError.response?.data?.code === 'b2b_pending'
          ? '/compte/en-attente'
          : '/compte'
      }
    }
    return Promise.reject(error)
  }
)

export default client
