import api from './axios';

export const ordersService = {
  // Get vendor orders
  getVendorOrders: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return await api.get(`/orders/vendor?${queryParams}`);
  },

  // Get single order
  getOrder: async (orderId) => {
    return await api.get(`/orders/${orderId}`);
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    return await api.patch(`/orders/${orderId}/status`, { status });
  },
};