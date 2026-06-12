import api from '../axios';

export async function getRawProducts(params = {}) {
  const { data } = await api.get('/admin/storefront/products', { params });
  return data;
}

export async function getRawProductFilters() {
  const { data } = await api.get('/admin/storefront/products/filters');
  return data;
}

export async function getRawProduct(id) {
  const { data } = await api.get(`/admin/storefront/products/${id}`);
  return data;
}

export async function getListings(params = {}) {
  const { data } = await api.get('/admin/storefront/', { params });
  return data;
}

export async function getListing(id) {
  const { data } = await api.get(`/admin/storefront/${id}`);
  return data;
}

export async function createListing(body) {
  const { data } = await api.post('/admin/storefront/', body);
  return data;
}

export async function bulkCreateListings(body) {
  const { data } = await api.post('/admin/storefront/bulk', body);
  return data;
}

export async function updateListing(id, body) {
  const { data } = await api.patch(`/admin/storefront/${id}`, body);
  return data;
}

export async function deleteListing(id) {
  const { data } = await api.delete(`/admin/storefront/${id}`);
  return data;
}

export async function getCategories() {
  const { data } = await api.get('/categories');
  return data;
}

export async function createCategory(body) {
  const { data } = await api.post('/categories', body);
  return data;
}

export async function updateCategory(id, body) {
  const { data } = await api.put(`/categories/${id}`, body);
  return data;
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
}
