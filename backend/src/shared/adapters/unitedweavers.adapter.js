/**
 * United Weavers vendor sheet adapter — Rugs.
 *
 * Two CSV inputs:
 *  - catalogCsv   : UW MasterFile (one row per SKU / size variant)
 *  - inventoryCsv : UW Inventory file (one row per SKU, joined by UPC;
 *                   provides live stock qty and actual rug dimensions)
 *
 * Key structural differences from ACME:
 *  - Multiple size variants per product, grouped by `Variation Group Code`
 *  - All three price tiers (Cost / MAP / MSRP) are present per variant
 *  - Inventory CSV has 4 header rows before data rows
 *  - Image URLs are separate named columns (not a comma list)
 *
 * Output: normalized { product, variant } records — one per SKU — ready
 * for runVendorImport('UW', records) in vendorImport.service.js.
 * The same product object appears once per size variant; the service
 * upserts it on first encounter and skips duplicates via specHash.
 *
 * Pure transform — no DB / network access.
 */

import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';
import { buildSlug, buildAttribute, resolveCategories, parseNumber } from './helpers.js';
import { UW_CATEGORY_MAP } from './categoryMaps/unitedweavers.js';

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function parseCatalogCsv(input) {
  const rows = parse(input, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  // Trim trailing spaces from column names (e.g. "Collection ", "UPC ")
  return rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[k.trim()] = v;
    return out;
  });
}

// The inventory CSV has 4 header rows (3 descriptive + 1 column-name row) with
// duplicate column labels ("Number", "Inch", "Date" appear twice). We skip all
// 4 header rows and map columns positionally to avoid ambiguity.
const INVENTORY_COLUMNS = [
  'collectionName', 'sizeCode', 'collectionNumber', 'designNumber',
  'designName', 'upc', 'weightOz', 'shippingDimensions',
  'widthInch', 'lengthInch', 'onHandQty', 'createDate', 'eta',
];

function parseInventoryCsv(input) {
  return parse(input, {
    columns: INVENTORY_COLUMNS,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    from_line: 5, // skip 3 descriptive rows + 1 column-name row
  });
}

function indexByUpc(rows) {
  const map = new Map();
  for (const row of rows) {
    const upc = normalizeUpc(row.upc);
    if (upc) map.set(upc, row);
  }
  return map;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function normalizeUpc(raw) {
  return raw?.trim().replace(/\D/g, '') || null;
}

function computeHash(rows) {
  return createHash('md5').update(JSON.stringify(rows)).digest('hex');
}

// "$29.00 " → 29.00
function parsePrice(raw) {
  if (!raw) return null;
  const match = String(raw).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// "5 Ibs" → 5
function parseWeight(raw) {
  if (!raw) return null;
  const match = String(raw).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// "31" x 7" x 7"" or "22x 6x 6" → { length, width, height }
function parseShippingDimensions(raw) {
  if (!raw) return null;
  const nums = String(raw).match(/[\d.]+/g)?.map(Number);
  if (!nums || nums.length < 2) return null;
  return { length: nums[0], width: nums[1], height: nums[2] ?? null };
}

// "Affinity Teton Red Runner Rug 1'10" X 7' 2"" → "Affinity Teton Red Rug"
function buildProductName(row) {
  const parts = [
    row['Collection'],
    row['Design Name'],
    row['Color Name'],
  ].map(v => v?.trim()).filter(Boolean);
  return parts.join(' ') + ' Rug';
}

// ─── Per-row builders ─────────────────────────────────────────────────────────

const IMAGE_FIELDS = [
  'Image Link - Headshot',
  'Image Link - Room Scene 1',
  'Image Link - Room Scene 2',
  'Image Link - Room Scene 3',
  'Image Link - Angle Shot 1',
  'Image Link - Angle Shot 2',
  'Image Link - Close Up',
  'Image Link - Side Close Up',
  'Image Link - Backing',
  'Image Link - Height/Thickness',
];

function rowImageUrls(row) {
  return IMAGE_FIELDS.map(f => row[f]?.trim()).filter(Boolean);
}

// Build product-level media, handling single-color and multi-color variant groups.
// When multiple Primary Colors exist in the group, each color's images are tagged
// with variantSkus so the storefront can switch images on variant selection.
// variantSkus are resolved to DB IDs at query time in storefront.transforms.js.
function buildProductMedia(groupRows) {
  // Group rows by Primary Color
  const colorGroups = new Map();
  for (const row of groupRows) {
    const color = row['Primary Color']?.trim() || '__default__';
    if (!colorGroups.has(color)) colorGroups.set(color, []);
    colorGroups.get(color).push(row);
  }

  const firstRow = groupRows[0];
  const firstUrls = rowImageUrls(firstRow);
  const mainUrl = firstUrls[0] || null;

  if (colorGroups.size <= 1) {
    // All variants share the same color — single shared image set
    const rest = firstUrls.slice(1);
    return {
      mainImage: mainUrl,
      media: mainUrl
        ? { mainImages: [{ url: mainUrl }], additionalImages: rest.map(url => ({ url })) }
        : null,
    };
  }

  // Multiple colors: first color's headshot becomes the product main image.
  // Each color group's images are tagged with the SKUs of ALL variants in that group
  // so the storefront can switch the gallery when a different-color variant is selected.
  const additionalImages = [];
  let isFirstColor = true;

  for (const [, rows] of colorGroups) {
    const colorSkus = rows.map(r => r['Style Number']?.trim().replace(/\s+/g, '-'));
    const urls = rowImageUrls(rows[0]); // representative row for this color
    const startIdx = isFirstColor ? 1 : 0; // skip headshot for first color (already mainImage)

    for (const url of urls.slice(startIdx)) {
      additionalImages.push({ url, variantSkus: colorSkus });
    }
    isFirstColor = false;
  }

  return {
    mainImage: mainUrl,
    media: mainUrl
      ? { mainImages: [{ url: mainUrl }], additionalImages }
      : null,
  };
}

function buildMedia(row) {
  const urls = rowImageUrls(row);
  if (!urls.length) return { mainImage: null, media: null };

  const [mainUrl, ...rest] = urls;
  return {
    mainImage: mainUrl,
    media: {
      mainImages: [{ url: mainUrl }],
      additionalImages: rest.map(url => ({ url })),
    },
  };
}

function buildVariantAttributes(row) {
  return [
    buildAttribute('color', row['Color Name']),
    buildAttribute('primary_color', row['Primary Color']),
    buildAttribute('secondary_color', row['Secondary Color']),
    buildAttribute('shape', row['Shape']),
    buildAttribute('rug_type', row['Rug Type']),
    buildAttribute('size', row['Actual Size']),
    buildAttribute('material', row['Material']),
    buildAttribute('construction', row['Construction']),
    buildAttribute('pile_height_mm', row['Pile Height in MM']),
    buildAttribute('pattern', row['Pattern']),
    buildAttribute('country_of_origin', row['Country of Origin']),
    buildAttribute('care', row['Care Instructions']),
  ].filter(Boolean);
}

// Actual rug dimensions from inventory (clean numbers); pile height from catalog.
function buildDimensions(row, inv) {
  const width = parseNumber(inv?.widthInch);
  const length = parseNumber(inv?.lengthInch);
  const pileHeight = parseNumber(row['Pile Height in IN']);
  if (!width && !length) return null;
  return { width, length, height: pileHeight, unitOfMeasureDistance: 'in' };
}

// Shipping packaging from catalog (has inch markers → cleaner parse).
function buildPackaging(row) {
  return {
    dimensions: parseShippingDimensions(row['Shipping Dimensions']),
    weight: parseWeight(row['Shipping Weight']),
    weightUnitOfMeasure: 'lb',
    dimensionsUnitOfMeasure: 'in',
    shipType: 'GROUND',
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Object}        sheets
 * @param {string|Buffer} sheets.catalogCsv    - UW MasterFile CSV
 * @param {string|Buffer} sheets.inventoryCsv  - UW Inventory CSV
 * @returns {Array<{product: Object, variant: Object}>}
 */
export function parseUnitedWeaversRugs({ catalogCsv, inventoryCsv }) {
  const catalogRows = parseCatalogCsv(catalogCsv);
  const inventoryByUpc = indexByUpc(parseInventoryCsv(inventoryCsv));

  // Group catalog rows by Variation Group Code → one product : N size variants
  const groups = new Map();
  for (const row of catalogRows) {
    const groupCode = row['Variation Group Code']?.trim();
    if (!groupCode) continue;
    if (!groups.has(groupCode)) groups.set(groupCode, []);
    groups.get(groupCode).push(row);
  }

  const records = [];

  for (const [groupCode, groupRows] of groups) {
    const firstRow = groupRows[0];
    const productName = buildProductName(firstRow);
    const externalId = groupCode;
    const specHash = computeHash(groupRows);

    // Resolve category from Rug Type (e.g. "Indoor" → "rugs")
    const rugType = firstRow['Rug Type']?.trim() || 'Indoor';
    const { categoryPath } = resolveCategories([rugType], UW_CATEGORY_MAP);

    // Key features → specifications list
    const specKeys = ['Key Features #1','Key Features #2','Key Features #3',
                      'Key Features #4','Key Features #5','Key Features #6','Key Features #7'];
    const specifications = specKeys.map(k => firstRow[k]?.trim()).filter(Boolean);

    const { mainImage, media } = buildProductMedia(groupRows);

    const product = {
      source: 'UW',
      externalId,
      slug: buildSlug(productName, groupCode),
      name: productName,
      description: firstRow['Rug Copy']?.trim() || '',
      brand: 'United Weavers',
      collection: firstRow['Collection']?.trim() || null,
      categoryPath: categoryPath || 'rugs',
      categories: [{ path: categoryPath || 'rugs' }],
      media,
      mainImage,
      // minPrice/maxPrice are set after all variants are scanned (below)
      minPrice: null,
      maxPrice: null,
      compareAtPrice: null,
      totalStock: 0,
      isActive: true,
      specHash,
      externalData: {
        specifications,
        styles: [firstRow['Style #1'], firstRow['Style #2'], firstRow['Pattern']].filter(Boolean),
        recommendedRooms: firstRow['Recommended Rooms']?.trim() || null,
        edgeAndBack: firstRow['Edge & Back']?.trim() || null,
        materialBreakdown: firstRow['Material Breakdown %']?.trim() || null,
        productLink: firstRow['Product Link']?.trim() || null,
      },
    };

    const costs = [];
    const retailPrices = [];

    for (const row of groupRows) {
      const upc = normalizeUpc(row['UPC']);
      const inv = upc ? inventoryByUpc.get(upc) : null;
      const stock = parseNumber(inv?.onHandQty) || 0;

      product.totalStock += stock;

      const cost = parsePrice(row['Cost']);
      const mapPrice = parsePrice(row['MAP']);
      const retailPrice = parsePrice(row['MSRP']);

      if (cost != null) costs.push(cost);
      if (retailPrice != null) retailPrices.push(retailPrice);

      const sku = row['Style Number']?.trim().replace(/\s+/g, '-');
      const whileQtyLasts = row['WHILE QTY LASTS']?.trim().toUpperCase() === 'X';

      const variant = {
        sku,
        upc,
        status: 'Active',
        isActive: true,
        price: { cost, mapPrice, retailPrice },
        dimensions: buildDimensions(row, inv),
        packaging: buildPackaging(row),
        attributes: buildVariantAttributes(row),
        stockQuantity: stock,
        custom: {
          sizeGrouping: row['Size Grouping']?.trim() || null,
          actualSize: row['Actual Size']?.trim() || null,
          whileQtyLasts,
        },
      };

      records.push({ product, variant });
    }

    // Back-fill product price aggregates once all variants are scanned
    product.minPrice = costs.length ? Math.min(...costs) : null;
    product.maxPrice = costs.length ? Math.max(...costs) : null;
    product.compareAtPrice = retailPrices.length ? Math.max(...retailPrices) : null;
  }

  return records;
}
