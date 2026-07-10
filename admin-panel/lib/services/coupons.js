import api from '../axios';

export async function getCoupons() {
  const { data } = await api.get('/admin/coupons');
  return data;
}

export async function createCoupon(body) {
  const { data } = await api.post('/admin/coupons', body);
  return data;
}

export async function updateCoupon(id, body) {
  const { data } = await api.patch(`/admin/coupons/${id}`, body);
  return data;
}

export async function deleteCoupon(id) {
  const { data } = await api.delete(`/admin/coupons/${id}`);
  return data;
}
