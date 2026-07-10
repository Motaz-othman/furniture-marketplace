import api from '../axios';

export async function getDashboardStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

export async function getRevenueChart() {
  const { data } = await api.get('/admin/revenue-chart');
  return data;
}

export async function getRecentActivity() {
  const { data } = await api.get('/admin/recent-activity');
  return data;
}
