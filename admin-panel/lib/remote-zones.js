/**
 * Remote Zip Code Lookup
 *
 * Loads /public/data/remote table.csv once and builds a Set of zip codes
 * where Area Type === "Beyond Area".
 *
 * Usage:
 *   const remote = await isRemoteZip('03215')  // true
 *   const remote = await isRemoteZip('01001')  // false
 */

let cache = null;

async function loadRemoteSet() {
  if (cache) return cache;

  const res  = await fetch('/data/remote table.csv');
  const text = await res.text();

  // Strip UTF-8 BOM if present
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  const beyondZips = new Set();
  const lines = clean.split('\n');

  // Parse header to find column indices
  const headers = parseCSVLine(lines[0]);
  const zipIdx      = headers.indexOf('ZIPCode');
  const areaTypeIdx = headers.indexOf('Area Type');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols[areaTypeIdx]?.trim() === 'Beyond Area') {
      beyondZips.add(cols[zipIdx]?.trim());
    }
  }

  cache = beyondZips;
  return beyondZips;
}

/**
 * Minimal CSV line parser that handles quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

/**
 * Returns true if the zip code is a Beyond Area (remote).
 * @param {string} zip
 * @returns {Promise<boolean>}
 */
export async function isRemoteZip(zip) {
  if (!zip || zip.length < 5) return false;
  const set = await loadRemoteSet();
  return set.has(zip.trim());
}

/** Preload the remote table in the background (call on page mount) */
export function preloadRemoteTable() {
  loadRemoteSet().catch(() => {});
}
