// src/lib/api/orders.service.js
import api from './axios';

export const ordersService = {
  // Get vendor orders with filtering and pagination
  getVendorOrders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const response = await api.get(`/orders/vendor${queryString ? `?${queryString}` : ''}`);
    // axios returns { data: {...} }, so extract .data if needed
    return response?.data || response;
  },

  // Get single order by ID
  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response?.data || response;
  },

  // Update order status
  // Backend expects: PATCH /orders/:id/status 
  // Body: { status, trackingNumber? }
  // NOTE: trackingNumber is REQUIRED when status is 'SHIPPED'
  updateStatus: async (orderId, status, trackingNumber = null) => {
    console.log('📦 Updating order status:', orderId, 'to', status);
    
    // Build request body
    const body = { status };
    
    // Add tracking number if provided (required for SHIPPED)
    if (trackingNumber) {
      body.trackingNumber = trackingNumber;
    }
    
    console.log('📦 Request body:', body);
    
    const response = await api.patch(`/orders/${orderId}/status`, body);
    console.log('📦 Response:', response);
    return response?.data || response;
  },

  // Cancel order
  cancelOrder: async (orderId, reason = null) => {
    const response = await api.patch(`/orders/${orderId}/status`, { 
      status: 'CANCELLED',
      reason 
    });
    return response?.data || response;
  },

  // Get order statistics
  getOrderStats: async () => {
    const response = await api.get('/orders/vendor/stats');
    return response?.data || response;
  },
};

export default ordersService;