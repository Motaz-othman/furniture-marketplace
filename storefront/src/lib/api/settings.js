import { get } from './client';

export async function getSettings() {
  return get('/settings');
}
