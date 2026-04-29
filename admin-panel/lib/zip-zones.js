/**
 * Zip Code → Zone lookup
 *
 * Loads /public/data/zone table.csv once and builds an in-memory map.
 * Usage:
 *   const { state, zone } = lookupZip('90210') ?? {}
 */

let cache = null;

async function loadZoneMap() {
  if (cache) return cache;

  const res = await fetch('/data/zone table.csv');
  const text = await res.text();

  const map = new Map();
  const lines = text.split('\n');

  // skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [zip, , state, zone] = line.split(',');
    if (zip && state && zone) {
      map.set(zip.trim(), { state: state.trim(), zone: zone.trim() });
    }
  }

  cache = map;
  return map;
}

/**
 * Look up a zip code.
 * @param {string} zip - 5-digit zip code
 * @returns {{ state: string, zone: string } | null}
 */
export async function lookupZip(zip) {
  if (!zip || zip.length < 5) return null;
  const map = await loadZoneMap();
  return map.get(zip.trim()) ?? null;
}

/** Preload the map in the background (call on page mount) */
export function preloadZoneMap() {
  loadZoneMap().catch(() => {});
}
