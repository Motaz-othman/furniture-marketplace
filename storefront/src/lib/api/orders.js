import { get, patch } from './client';

export async function getCustomerOrders(params = {}) {
  return get('/orders/customer', { params });
}

export async function getOrderById(id) {
  return get(`/orders/${id}`);
}

export async function cancelOrder(id) {
  return patch(`/orders/${id}/cancel`);
}
