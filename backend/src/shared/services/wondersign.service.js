/**
 * Wondersign API Service
 *
 * Toggle between mock (local JSON) and live (Wondersign API) modes via env:
 *   WONDERSIGN_MODE=mock   → reads from prisma/seed-data/*.json
 *   WONDERSIGN_MODE=live   → calls Wondersign API (requires WONDERSIGN_API_URL + WONDERSIGN_API_KEY)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '../../../prisma/seed-data');

const MODE = process.env.WONDERSIGN_MODE || 'mock';
const API_URL = process.env.WONDERSIGN_API_URL;
const API_KEY = process.env.WONDERSIGN_API_KEY;
const PAGE_SIZE = parseInt(process.env.WONDERSIGN_PAGE_SIZE || '300');

function loadJsonFile(filename) {
  const filePath = resolve(SEED_DIR, filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

async function fetchFromApi(endpoint, params = {}) {
  if (!API_URL || !API_KEY) {
    throw new Error('WONDERSIGN_API_URL and WONDERSIGN_API_KEY must be set in live mode');
  }

  const url = new URL(`${API_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Wondersign API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all pages from a paginated Wondersign endpoint.
 * Uses skip/limit pagination per Wondersign API spec.
 */
async function fetchAllPages(endpoint, params = {}) {
  const limit = params.limit || PAGE_SIZE;
  let skip = 0;
  let allResults = [];

  while (true) {
    const page = await fetchFromApi(endpoint, { ...params, skip, limit });
    const results = Array.isArray(page) ? page : (page.data || page.results || []);
    allResults = allResults.concat(results);

    if (results.length < limit) break; // last page
    skip += limit;
  }

  return allResults;
}

/**
 * Fetch products from Wondersign (mock or live)
 * @param {Object} options
 * @param {string} [options.changedSince] - ISO 8601 timestamp for incremental sync
 */
export async function fetchProducts({ changedSince } = {}) {
  if (MODE === 'mock') {
    return loadJsonFile('wondersign-products.json');
  }

  const params = {};
  if (changedSince) params.changedSince = changedSince;

  return fetchAllPages('/products', params);
}

/**
 * Fetch inventory data from Wondersign (mock or live)
 */
export async function fetchInventory() {
  if (MODE === 'mock') {
    return loadJsonFile('wondersign-inventory.json');
  }
  return fetchAllPages('/inventory');
}

/**
 * Fetch categories from Wondersign (mock or live)
 */
export async function fetchCategories() {
  if (MODE === 'mock') {
    return loadJsonFile('wondersign-categories.json');
  }
  return fetchAllPages('/categories');
}

export default { fetchProducts, fetchInventory, fetchCategories };
