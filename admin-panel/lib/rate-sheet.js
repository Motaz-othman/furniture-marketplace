/**
 * Rate Sheet Lookup
 *
 * Parses /public/data/rate sheet.csv once and builds an in-memory lookup:
 *   rates[section][destZone][originZone] = price
 *
 * Sections:
 *   'TH <25'   – Threshold flat rate, cubes < 25
 *   'TH 25-35' – Threshold flat rate, cubes 25–35
 *   'TH RPC'   – Threshold rate-per-cube  (cubes > 35)
 *   'TH MIN'   – Threshold minimum charge (cubes > 35)
 *   'WG RPC'   – White Glove rate-per-cube
 *   'WG Flat'  – White Glove flat rate
 *   'ROC Min'  – Room of Choice minimum
 *   'ROC RPC'  – Room of Choice rate-per-cube
 */

const SECTION_KEYS = ['TH <25', 'TH 25-35', 'TH RPC', 'TH MIN', 'WG RPC', 'WG Flat', 'ROC Min', 'ROC RPC'];

let cache = null;

async function loadRates() {
  if (cache) return cache;

  const res = await fetch('/data/rate sheet.csv');
  const text = await res.text();
  const rows = text.split('\n').map(line => line.split(','));

  const rates = {};

  for (let i = 0; i < rows.length; i++) {
    const sectionKey = rows[i][0]?.trim();
    if (!SECTION_KEYS.includes(sectionKey)) continue;

    // Origin zone headers are on the row immediately before the section key row
    // e.g. ",,Zone 1 L,Zone 2 L,..."
    const originHeaders = rows[i - 1].slice(2).map(h => h.trim()).filter(Boolean);

    rates[sectionKey] = {};

    // Row i   = section key ("TH <25, Origins →,...")
    // Row i+1 = sub-header ("↓Destination, 1 L, ...")  — skip
    // Row i+2 = first data row
    for (let j = i + 2; j < rows.length; j++) {
      const row = rows[j];
      const destZone = row[1]?.trim();

      // Stop at blank or next section boundary
      if (!destZone || !destZone.startsWith('Zone')) break;

      rates[sectionKey][destZone] = {};
      for (let k = 0; k < originHeaders.length; k++) {
        const price = parseFloat(row[k + 2]);
        if (!isNaN(price)) {
          rates[sectionKey][destZone][originHeaders[k]] = price;
        }
      }
    }
  }

  cache = rates;
  return rates;
}

/**
 * Calculate shipping costs for all three service tiers.
 *
 * @param {string} originZone  – e.g. "Zone 3 L"
 * @param {string} destZone    – e.g. "Zone 10 L"
 * @param {number} cubes       – total cubic feet
 * @returns {Promise<{ threshold: number|null, roomOfChoice: number|null, whiteGlove: number|null }>}
 */
export async function calculateRates(originZone, destZone, cubes) {
  if (!originZone || !destZone || !cubes) return { threshold: null, roomOfChoice: null, whiteGlove: null };

  const rates = await loadRates();

  function get(section) {
    return rates[section]?.[destZone]?.[originZone] ?? null;
  }

  // ── Threshold ────────────────────────────────────────────────────
  let threshold = null;
  if (cubes < 25) {
    threshold = get('TH <25');
  } else if (cubes <= 35) {
    threshold = get('TH 25-35');
  } else {
    const min = get('TH MIN');
    const rpc = get('TH RPC');
    if (rpc !== null) {
      threshold = min !== null ? Math.max(min, rpc * cubes) : rpc * cubes;
    }
  }

  // ── Room of Choice ───────────────────────────────────────────────
  const rocMin = get('ROC Min');
  const rocRpc = get('ROC RPC');
  let roomOfChoice = null;
  if (rocRpc !== null) {
    roomOfChoice = rocMin !== null ? Math.max(rocMin, rocRpc * cubes) : rocRpc * cubes;
  }

  // ── White Glove ──────────────────────────────────────────────────
  const wgFlat = get('WG Flat');
  const wgRpc  = get('WG RPC');
  let whiteGlove = null;
  if (wgRpc !== null) {
    whiteGlove = wgFlat !== null ? Math.max(wgFlat, wgRpc * cubes) : wgRpc * cubes;
  }

  return { threshold, roomOfChoice, whiteGlove };
}

/** Preload the rate sheet in the background (call on page mount) */
export function preloadRateSheet() {
  loadRates().catch(() => {});
}
