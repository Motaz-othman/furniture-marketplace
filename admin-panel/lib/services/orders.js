import api from '../axios';

export async function getOrders(params = {}) {
  const { data } = await api.get('/admin/orders', { params });
  return data;
}

export async function getOrder(id) {
  const { data } = await api.get(`/admin/orders/${id}`);
  return data;
}

export async function updateOrderStatus(id, status, note) {
  const { data } = await api.patch(`/admin/orders/${id}/status`, { status, ...(note && { note }) });
  return data;
}

export async function createShipment(orderId, body) {
  const { data } = await api.post(`/admin/orders/${orderId}/shipments`, body);
  return data;
}

export async function updateShipment(orderId, shipmentId, body) {
  const { data } = await api.patch(`/admin/orders/${orderId}/shipments/${shipmentId}`, body);
  return data;
}

export async function deleteShipment(orderId, shipmentId) {
  const { data } = await api.delete(`/admin/orders/${orderId}/shipments/${shipmentId}`);
  return data;
}

export async function assignShipmentItems(orderId, shipmentId, itemIds) {
  const { data } = await api.patch(`/admin/orders/${orderId}/shipments/${shipmentId}/items`, { itemIds });
  return data;
}

export async function updateItemStatus(orderId, itemId, status) {
  const { data } = await api.patch(`/admin/orders/${orderId}/items/${itemId}/status`, { status });
  return data;
}

export async function processRefund(orderId, amount, reason) {
  const { data } = await api.post('/payments/refund', { orderId, amount, reason });
  return data;
}

export async function updateReturnRequest(returnRequestId, status, adminNotes) {
  const { data } = await api.patch(`/admin/return-requests/${returnRequestId}`, {
    status,
    ...(adminNotes && { adminNotes }),
  });
  return data;
}
