import { get, patch, post } from './client';

export async function getCustomerOrders(params = {}) {
  return get('/orders/customer', { params });
}

export async function getOrderById(id) {
  return get(`/orders/${id}`);
}

export async function cancelOrder(id) {
  return patch(`/orders/${id}/cancel`);
}

export async function getOrderReturnRequests(orderId) {
  return get(`/orders/${orderId}/return-requests`);
}

export async function requestReturn(orderId, items) {
  // items: [{ orderItemId, quantity, reason }]
  return post(`/orders/${orderId}/request-return`, { items });
}
