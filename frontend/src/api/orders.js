import client from './client'

export const createOrder = (data) => client.post('/orders/', data)
export const getOrders = () => client.get('/orders/')
export const getOrder = (id) => client.get(`/orders/${id}/`)
export const initiateYassir = (orderId) => client.post('/yassir/initiate/', { order_id: orderId })
