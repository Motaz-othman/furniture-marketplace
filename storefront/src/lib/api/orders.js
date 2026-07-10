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

export async function requestReturn(id, reason, selectedItems) {
  return post(`/orders/${id}/request-return`, { reason, selectedItems });
}
