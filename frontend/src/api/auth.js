import client from './client'

export const login = (data) => client.post('/auth/login/', data)
export const verifyOTP = (data) => client.post('/auth/verify-otp/', data)
export const register = (data) => client.post('/auth/register/', data)
export const registerB2B = (data) => client.post('/auth/register-b2b/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const logout = (refresh) => client.post('/auth/logout/', { refresh })
export const getProfile = () => client.get('/auth/profile/')
export const updateProfile = (data) => client.put('/auth/profile/', data)
export const socialLogin = (provider, token) => client.post(`/auth/${provider}/`, { token })
