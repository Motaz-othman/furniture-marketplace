import api from '../axios';

export async function getVendorImportStatus() {
  const { data } = await api.get('/admin/vendor-import/status');
  return data;
}

export async function getVendorImportLogs(params = {}) {
  const { data } = await api.get('/admin/vendor-import/logs', { params });
  return data;
}

export async function importAcme({ specCsv, imagesCsv, priceCsv, inventoryCsv }) {
  const formData = new FormData();
  formData.append('specCsv', specCsv);
  formData.append('imagesCsv', imagesCsv);
  formData.append('priceCsv', priceCsv);
  formData.append('inventoryCsv', inventoryCsv);
  const { data } = await api.post('/admin/vendor-import/acme/import', formData);
  return data;
}

export async function refreshAcme({ priceCsv, inventoryCsv }) {
  const formData = new FormData();
  formData.append('priceCsv', priceCsv);
  formData.append('inventoryCsv', inventoryCsv);
  const { data } = await api.post('/admin/vendor-import/acme/refresh', formData);
  return data;
}

export async function clearGlobalFurnitureProducts() {
  const { data } = await api.delete('/admin/vendor-import/gfw/products');
  return data;
}

export async function importGlobalFurniture({ dataCsv, inventoryCsv }) {
  const formData = new FormData();
  formData.append('dataCsv', dataCsv);
  formData.append('inventoryCsv', inventoryCsv);
  const { data } = await api.post('/admin/vendor-import/gfw/import', formData);
  return data;
}

export async function importUnitedWeavers({ catalogCsv, inventoryCsv }) {
  const formData = new FormData();
  formData.append('catalogCsv', catalogCsv);
  formData.append('inventoryCsv', inventoryCsv);
  const { data } = await api.post('/admin/vendor-import/uw/import', formData);
  return data;
}

export async function triggerGfwDropboxSync() {
  const { data } = await api.post('/admin/vendor-import/gfw/dropbox-sync');
  return data;
}

export async function resetGfwDropboxSync() {
  const { data } = await api.post('/admin/vendor-import/gfw/dropbox-reset');
  return data;
}

export async function triggerUwImageSync() {
  const { data } = await api.post('/admin/vendor-import/uw/sync-images');
  return data;
}

export async function getUwPendingImages() {
  const { data } = await api.get('/admin/vendor-import/uw/pending-images');
  return data;
}

export async function migrateUwProductImages(productId) {
  const { data } = await api.post(`/admin/vendor-import/uw/migrate-product/${productId}`);
  return data;
}

export async function getUwPendingCompress() {
  const { data } = await api.get('/admin/vendor-import/uw/pending-compress');
  return data;
}

export async function compressUwProductImages(productId) {
  const { data } = await api.post(`/admin/vendor-import/uw/compress-product/${productId}`);
  return data;
}
