/**
 * Uncovered Areas Lookup
 *
 * Loads /public/data/uncovered areas.csv once and builds a Set of zip codes
 * that Gigiga Cloud does not service.
 *
 * Usage:
 *   const blocked = await isUncoveredZip('54001')  // true
 */

let cache = null;

async function loadUncoveredSet() {
  if (cache) return cache;

  const res  = await fetch('/data/uncovered areas.csv');
  const text = await res.text();
  const set  = new Set();
  const lines = text.split('\n');

  // skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const zip = lines[i].split(',')[0]?.trim();
    if (zip) set.add(zip);
  }

  cache = set;
  return set;
}

/**
 * Returns true if the zip code is in an uncovered (unserviced) area.
 * @param {string} zip
 * @returns {Promise<boolean>}
 */
export async function isUncoveredZip(zip) {
  if (!zip || zip.length < 5) return false;
  const set = await loadUncoveredSet();
  return set.has(zip.trim());
}

/** Preload in the background (call on page mount) */
export function preloadUncoveredAreas() {
  loadUncoveredSet().catch(() => {});
}
