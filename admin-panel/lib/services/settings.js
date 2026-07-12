import api from '../axios';

export async function getSettings() {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(body) {
  const { data } = await api.put('/settings', body);
  return data;
}

export async function getTaxRateSummary() {
  const { data } = await api.get('/settings/tax-rates/summary');
  return data;
}

export async function uploadTaxRatesCsv(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/settings/tax-rates/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
