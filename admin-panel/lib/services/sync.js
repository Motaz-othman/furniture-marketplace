import api from '../axios';

export async function getSyncStatus() {
  const { data } = await api.get('/admin/sync/status');
  return data;
}

export async function getSyncLogs(params = {}) {
  const { data } = await api.get('/admin/sync/logs', { params });
  return data;
}

export async function triggerSync(body) {
  const { data } = await api.post('/admin/sync/trigger', body);
  return data;
}

export async function triggerProductSync(externalId) {
  const { data } = await api.post(`/admin/sync/trigger/product/${externalId}`);
  return data;
}

export async function getSchedule() {
  const { data } = await api.get('/admin/sync/schedule');
  return data;
}

export async function updateSchedule(body) {
  const { data } = await api.patch('/admin/sync/schedule', body);
  return data;
}
