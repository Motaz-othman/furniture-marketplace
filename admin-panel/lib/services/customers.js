import api from '../axios';

export async function getCustomers(params = {}) {
  const { data } = await api.get('/admin/customers', { params });
  return data;
}

export async function getCustomerDetail(id) {
  const { data } = await api.get(`/admin/customers/${id}`);
  return data;
}
