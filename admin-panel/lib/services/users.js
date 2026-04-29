import api from '../axios';

export async function getUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params });
  return data;
}

export async function getUser(id) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data;
}

export async function updateUser(id, body) {
  const { data } = await api.patch(`/admin/users/${id}`, body);
  return data;
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}
