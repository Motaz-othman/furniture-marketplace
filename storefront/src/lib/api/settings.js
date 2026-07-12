import { get } from './client';

export async function getSettings() {
  return get('/settings');
}

export async function getTaxRateForZip(zipCode) {
  return get(`/settings/tax-rates/lookup/${zipCode}`);
}
