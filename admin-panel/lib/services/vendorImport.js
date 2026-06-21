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
