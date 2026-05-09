import api from '../axios';

export async function getSettings() {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(body) {
  const { data } = await api.put('/settings', body);
  return data;
}
