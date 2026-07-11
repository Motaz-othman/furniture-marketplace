import api from '../axios';

export async function getReturnRequests(params = {}) {
  const { data } = await api.get('/admin/return-requests', { params });
  return data;
}

export async function updateReturnRequest(id, status, adminNotes) {
  const { data } = await api.patch(`/admin/return-requests/${id}`, {
    status,
    ...(adminNotes !== undefined && { adminNotes }),
  });
  return data;
}

export async function refundReturnRequest(id) {
  const { data } = await api.post(`/admin/return-requests/${id}/refund`);
  return data;
}
