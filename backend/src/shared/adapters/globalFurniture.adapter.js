/**
 * Global Furniture (GFW) vendor sheet adapter.
 *
 * Accepts two files:
 *  - dataCsv      Product Data Sheet — product info, images, dimensions, kit members
 *  - inventoryCsv Search Results export — WHS (wholesale) price, stock quantities
 *
 * The two files are joined on the `Name` field. Search results sometimes append
 * a short suffix (e.g. "-N") that the data sheet omits; both the raw and
 * suffix-stripped form are indexed so either side can match.
 *
 * Output: normalized { product, variant } records ready for runVendorImport.
 * Pure transform — no DB/network access.
 */

import { parse } from 'csv-parse/sync';
import { buildSlug, buildAttribute, resolveCategories, parseNumber } from './helpers.js';
import { GLOBAL_FURNITURE_CATEGORY_MAP } from './categoryMaps/globalFurniture.js';

const MEMBER_ITEM_SLOTS = 10;

function parseCsv(input) {
  if (input == null) return [];
  return parse(input, { columns: true, skip_empty_lines: true, trim: true });
}

// Strip trailing short token like "-N", "-A" from inventory CSV SKU names.
function normalizeSkuName(name) {
  return name.replace(/-[A-Za-z0-9]{1,2}$/, '').trim();
}

/**
 * Build a lookup map from the inventory (search results) CSV.
 * Keyed by both the raw Name and the suffix-stripped Name so either form matches.
 */
function buildInventoryMap(inventoryCsv) {
  const rows = parseCsv(inventoryCsv);
  const map = new Map();

  for (const row of rows) {
    const rawName = row['Name']?.trim();
    if (!rawName) continue;

    const entry = {
      whsPrice: parseNumber(row['WHS Price']),
      qtyAvailable: Math.max(0, parseNumber(row['Qty Available']) ?? 0),
      inTransit: parseNumber(row['In Transit']) ?? 0,
      nextArrivalDate: row['Next Arrival Date']?.trim() || null,
      nextArrivalQty: parseNumber(row['Next Arrival Quantity']) ?? 0,
    };

    map.set(rawName, entry);
    const stripped = normalizeSkuName(rawName);
    if (stripped !== rawName) map.set(stripped, entry);
  }

  return map;
}

// "Main Product Image" is sometimes a Dropbox folder share link — not a usable image.
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

export function buildImageMatchPrefixes(row) {
  const name = row['Name']?.trim();
  if (!name) return [];

  const prefixes = new Set([name]);
  const stripped = normalizeSkuName(name);
  if (stripped !== name && stripped.length >= 4) prefixes.add(stripped);

  return [...prefixes];
}

/**
 * @param {{ dataCsv: string|Buffer, inventoryCsv: string|Buffer }} files
 * @returns {Array<{product: Object, variant: Object}>}
 */
export function parseGlobalFurnitureCatalog({ dataCsv, inventoryCsv }) {
  const rows = parseCsv(dataCsv);
  const inventoryMap = buildInventoryMap(inventoryCsv);
  const records = [];

  for (const row of rows) {
    const sku = row['Internal ID']?.trim();
    if (!sku) continue;

    const dataSheetName = row['Name']?.trim();

    // Try exact match on data sheet Name first, then suffix-stripped form.
    const inv = (dataSheetName && (
      inventoryMap.get(dataSheetName) || inventoryMap.get(normalizeSkuName(dataSheetName))
    )) || null;

    const whsPrice = inv?.whsPrice ?? null;       // what we pay (wholesale)
    const listPrice = parseNumber(row['Price']);   // GFW retail/list price
    const stockQuantity = inv?.qtyAvailable ?? 0;
    const isActive = inv !== null;                // only active if present in inventory export

    const name = row['Display Name'];
    const isKit = row['Type']?.trim() === 'Kit';

    const { mainImage, media } = buildMedia(row);

    const categoryTokens = [row['Subcategory'], row['Category']].filter(Boolean);
    const { categoryPath, categories } = resolveCategories(categoryTokens, GLOBAL_FURNITURE_CATEGORY_MAP);

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
      minPrice: listPrice,
      maxPrice: listPrice,
      compareAtPrice: null,
      totalStock: stockQuantity,
      isActive,
      externalData: {
        specifications: buildSpecifications(row),
        internalName: dataSheetName || null,
        shortDescription: row['Description'] || null,
        cleaningInstructions: row['Cleaning Instructions'] || null,
        miscInfo: row['Miscellaneous Item Information'] || null,
        vendorAssetsLink: row['Product Information Link'] || null,
        imageMatchPrefixes: buildImageMatchPrefixes(row),
        ...(inv && {
          inTransit: inv.inTransit,
          nextArrivalDate: inv.nextArrivalDate,
          nextArrivalQty: inv.nextArrivalQty,
        }),
      },
    };

    const price = { retailPrice: listPrice };
    if (whsPrice != null) price.cost = whsPrice;
    if (listPrice != null) price.listPrice = listPrice;

    const variant = {
      sku,
      status: isActive ? 'Active' : 'Inactive',
      isActive,
      upc: row['UPC Code']?.replace(/^'/, '') || null,
      price,
      dimensions: buildDimensions(row),
      packaging: buildPackaging(row),
      attributes: buildAttributes(row),
      packageProducts: isKit ? buildPackageProducts(row) : null,
      packageProductType: isKit ? 'kit' : null,
      isPackage: isKit,
      stockQuantity,
    };

    records.push({ product, variant });
  }

  return records;
}
