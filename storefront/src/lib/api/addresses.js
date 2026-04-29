import { get, post, patch, del } from './client';

export async function getAddresses() {
  return get('/addresses');
}

export async function createAddress(data) {
  return post('/addresses', data);
}

export async function updateAddress(id, data) {
  return patch(`/addresses/${id}`, data);
}

export async function deleteAddress(id) {
  return del(`/addresses/${id}`);
}
