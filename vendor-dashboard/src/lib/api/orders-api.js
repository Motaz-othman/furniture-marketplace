const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ============ VENDOR ORDERS API ============

export const ordersApi = {
  async getVendorOrders(page = 1, limit = 10, status = null) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    
    const res = await fetch(`${API_URL}/orders/vendor?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch vendor orders');
    return res.json();
  },

  async getOrderById(orderId) {
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch order');
    return res.json();
  },

  async updateOrderStatus(orderId, status, trackingNumber = null) {
    const body = { status };
    if (trackingNumber) body.trackingNumber = trackingNumber;
    
    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update order status');
    }
    return res.json();
  },

  async processRefund(orderId, amount = null, reason = null) {
    const body = {};
    if (amount) body.amount = amount;
    if (reason) body.reason = reason;
    
    const res = await fetch(`${API_URL}/orders/${orderId}/refund`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to process refund');
    }
    return res.json();
  },
};
