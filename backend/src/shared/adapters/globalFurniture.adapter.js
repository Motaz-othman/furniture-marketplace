/**
 * Global Furniture (GFW) vendor sheet adapter.
 *
 * Unlike ACME, GFW ships one comprehensive CSV — price, images, dimensions,
 * packaging and "Kit" bundle breakdowns (Member Item 1-10) are all in the
 * same row, keyed by `Internal ID`.
 *
 * Output: normalized { product, variant } records, one per Internal ID,
 * ready for the vendor-import upsert service. Pure transform — no DB/network access.
 *
 * Two open items, deliberately defaulted here pending vendor feedback:
 *  - No status/Enabled-Disabled column → every row is treated as active
 *    (isActive: true). Revisit if GFW sends a removed-items list.
 *  - No inventory/stock column → stock defaults to 0 (out of stock) until
 *    a stock source is available.
 */

import { parse } from 'csv-parse/sync';
import { buildSlug, buildAttribute, resolveCategories, parseNumber } from './helpers.js';
import { GLOBAL_FURNITURE_CATEGORY_MAP } from './categoryMaps/globalFurniture.js';

const MEMBER_ITEM_SLOTS = 10;

function parseCsv(input) {
  if (input == null) return [];
  return parse(input, { columns: true, skip_empty_lines: true, trim: true });
}

// "Main Product Image" is sometimes filled with a Dropbox folder share link
// (same value as "Product Information Link") instead of a direct image —
// not a usable storefront image, so it's filtered out here.
function isUsableImageUrl(url) {
  return !url.includes('dropbox.com');
}

function buildMedia(row) {
  const urls = [row['Main Product Image'], row['Product Image 1'], row['Product Image 2'], row['Product Image 3']]
    .map(u => u?.trim())
    .filter(Boolean)
    .filter(isUsableImageUrl);

  if (!urls.length) return { media: null, mainImage: null };

  return {
    mainImage: urls[0],
    media: {
      mainImages: [{ url: urls[0] }],
      additionalImages: urls.slice(1).map(url => ({ url })),
    },
  };
}

function buildDimensions(row) {
  const width = parseNumber(row['Item Width']);
  const length = parseNumber(row['Item Length']);
  const height = parseNumber(row['Item Height']);
  const weight = parseNumber(row['Item Weight']);

  if (width == null && length == null && height == null && weight == null) return null;

  return {
    width, length, height, weight,
    unitOfMeasureDistance: 'in',
    unitOfMeasureWeight: 'lb',
  };
}

function buildPackaging(row) {
  const width = parseNumber(row['Carton Width']);
  const length = parseNumber(row['Carton Length']);
  const height = parseNumber(row['Carton Height']);
  const weight = parseNumber(row['Carton Weight']);
  const cubicFeet = parseNumber(row['CBFT']);
  const cartonCount = parseNumber(row['Carton Count']);
  const shipType = row['Shipment Type'] || null;

  return {
    dimensions: (width == null && length == null && height == null) ? null : { width, length, height },
    weight,
    weightUnitOfMeasure: 'lb',
    dimensionsUnitOfMeasure: 'in',
    cubicFeet,
    cartonCount,
    shipType,
  };
}

/**
 * Flatten "Member Item 1..10" (+ Quantity, Carton L/W/H/Weight) columns
 * into ProductVariant.packageProducts[]. Only present on Type="Kit" rows.
 */
function buildPackageProducts(row) {
  const items = [];

  for (let i = 1; i <= MEMBER_ITEM_SLOTS; i++) {
    const sku = row[`Member Item ${i}`]?.trim();
    if (!sku) continue;

    items.push({
      sku,
      quantity: parseNumber(row[`Member Item Quantity ${i}`]) ?? 1,
      cartonDimensions: {
        length: parseNumber(row[`Member Item Carton Length ${i}`]),
        width: parseNumber(row[`Member Item Carton Width ${i}`]),
        height: parseNumber(row[`Member Item Carton Height ${i}`]),
      },
      cartonWeight: parseNumber(row[`Member Item Carton Weight ${i}`]),
    });
  }

  return items.length ? items : null;
}

function buildAttributes(row) {
  return [
    buildAttribute('color', row['Color']),
    buildAttribute('style', row['Style']),
    buildAttribute('country_of_manufacture', row['Country of Origin']),
    buildAttribute('material', row['Material']),
    buildAttribute('finish', row['Fabric/Finish']),
    buildAttribute('fabric_content', row['Fabric Content']),
    buildAttribute('assembly_required', row['Assembly Required']),
    buildAttribute('removeable_backs', row['Removeable Backs']),
    buildAttribute('box_spring_required', row['Is box spring required?']),
    buildAttribute('slat_quantity', row['Slat Quantity']),
    buildAttribute('seat_dimensions', row['Seat Dimensions']),
    buildAttribute('seat_height', row['Seat Height']),
    buildAttribute('seat_back_height', row['Seat Back Height']),
    buildAttribute('leg_height', row['Leg Height']),
  ].filter(Boolean);
}

function buildSpecifications(row) {
  return [row['Key Feature #1'], row['Key Feature #2'], row['Key Feature #3'], row['Key Feature #4']]
    .map(f => f?.trim())
    .filter(Boolean);
}

/**
 * "Product Information Link" is usually a Dropbox folder shared across the
 * whole collection, containing `Product Images/JPEG/2000x2000/<prefix>-*.jpg`
 * files per-SKU. Derive candidate filename prefixes from the internal `Name`
 * (e.g. "2215-BLACK-KB-N" -> "2215-BLACK-KB") so the import service can pull
 * matching images out of that folder. Best-effort: an empty/no-match result
 * just means no extra images are fetched for this row.
 */
export function buildImageMatchPrefixes(row) {
  const name = row['Name']?.trim();
  if (!name) return [];

  const prefixes = new Set([name]);

  // Strip a trailing "-<short token>" (e.g. "-N") that vendor SKU codes
  // append but image filenames don't include.
  const stripped = name.replace(/-[A-Za-z0-9]{1,2}$/, '');
  if (stripped !== name && stripped.length >= 4) prefixes.add(stripped);

  return [...prefixes];
}

/**
 * @param {string|Buffer} csv
 * @returns {Array<{product: Object, variant: Object}>}
 */
export function parseGlobalFurnitureCatalog(csv) {
  const rows = parseCsv(csv);
  const records = [];

  for (const row of rows) {
    const sku = row['Internal ID']?.trim();
    if (!sku) continue;

    const name = row['Display Name'];
    const isKit = row['Type']?.trim() === 'Kit';
    const cost = parseNumber(row['Price']);

    const { mainImage, media } = buildMedia(row);

    const categoryTokens = [row['Subcategory'], row['Category']].filter(Boolean);
    const { categoryPath, categories } = resolveCategories(categoryTokens, GLOBAL_FURNITURE_CATEGORY_MAP);

    // No active/inactive signal from GFW — every row in the sheet is
    // assumed currently offered. See file header for the inventory caveat.
    const isActive = true;
    const totalStock = 0;

    const product = {
      source: 'GFW',
      externalId: sku,
      slug: buildSlug(name, sku),
      name,
      description: row['Product Romance'] || '',
      brand: 'Global Furniture USA',
      collection: row['Collection Name'] || null,
      categoryPath,
      categories,
      media,
      mainImage,
      // Base price = cost. Retail markup applied via StorefrontListing.pricingRule
      // at publish time, not baked in here.
      minPrice: cost,
      maxPrice: cost,
      compareAtPrice: null,
      totalStock,
      isActive,
      externalData: {
        specifications: buildSpecifications(row),
        internalName: row['Name'] || null,
        shortDescription: row['Description'] || null,
        cleaningInstructions: row['Cleaning Instructions'] || null,
        miscInfo: row['Miscellaneous Item Information'] || null,
        vendorAssetsLink: row['Product Information Link'] || null,
        imageMatchPrefixes: buildImageMatchPrefixes(row),
      },
    };

    const variant = {
      sku,
      status: 'Active',
      isActive,
      upc: row['UPC Code']?.replace(/^'/, '') || null,
      price: { cost, retailPrice: cost },
      dimensions: buildDimensions(row),
      packaging: buildPackaging(row),
      attributes: buildAttributes(row),
      packageProducts: isKit ? buildPackageProducts(row) : null,
      packageProductType: isKit ? 'kit' : null,
      isPackage: isKit,
      stockQuantity: totalStock,
    };

    records.push({ product, variant });
  }

  return records;
}
