/**
 * ACME vendor sheet adapter.
 *
 * ACME ships 4 separate CSVs, joined by `sku`:
 *  - spec sheet      (name, description, dimensions, packaging, category, ...)
 *  - image links     (comma-separated gallery URLs per sku)
 *  - price sheet     (cost per sku)
 *  - live inventory  (per-warehouse stock per sku)
 *
 * Output: normalized { product, variant } records, one per sku, ready for
 * the vendor-import upsert service. Pure transform — no DB/network access.
 *
 * Disabled rows are included as isActive:false so the import service can
 * deactivate them in the DB. SKUs absent from the upload entirely are handled
 * by a post-import deactivation pass in the service.
 */

import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';
import { buildSlug, cleanHtml, splitSpecifications, buildAttribute, resolveCategories, parseNumber } from './helpers.js';
import { ACME_CATEGORY_MAP } from './categoryMaps/acme.js';

const WAREHOUSE_COLUMNS = ['la_qty', 'ga_qty', 'fl_qty', 'nj_qty', 'ny_qty', 'tx_qty', 'sf_qty', 'il_qty'];

// Image filename suffixes that are spec diagrams/line drawings rather than
// product photography — skipped when picking the main image, but still kept
// in the gallery.
const NON_PRIMARY_IMAGE_SUFFIXES = ['_dim', '_draw'];

function computeSpecHash(specRow, imageRow, priceRow, inventoryRow) {
  const content = JSON.stringify({ spec: specRow, image: imageRow ?? null, price: priceRow ?? null, inventory: inventoryRow ?? null });
  return createHash('md5').update(content).digest('hex');
}

function parseCsv(input) {
  if (input == null) return [];
  return parse(input, { columns: true, skip_empty_lines: true, trim: true });
}

function indexBySku(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.sku) map.set(row.sku.trim(), row);
  }
  return map;
}

function buildMedia(imageRow) {
  const raw = imageRow?.['catalog_product_entity_media_gallery.images'];
  if (!raw) return { media: null, mainImage: null };

  const urls = raw.split(',').map(u => u.trim()).filter(Boolean);
  if (!urls.length) return { media: null, mainImage: null };

  const isNonPrimary = (url) => NON_PRIMARY_IMAGE_SUFFIXES.some(suffix => url.includes(`${suffix}.`));

  const mainUrl = urls.find(u => !isNonPrimary(u)) || urls[0];
  const additionalUrls = urls.filter(u => u !== mainUrl);

  return {
    mainImage: mainUrl,
    media: {
      mainImages: [{ url: mainUrl }],
      additionalImages: additionalUrls.map(url => ({ url })),
    },
  };
}

function buildInventory(inventoryRow) {
  if (!inventoryRow) return { totalStock: 0, warehouseStock: null };

  const warehouseStock = {};
  let total = 0;
  for (const col of WAREHOUSE_COLUMNS) {
    const qty = parseNumber(inventoryRow[col]) || 0;
    warehouseStock[col.replace('_qty', '').toUpperCase()] = qty;
    total += qty;
  }
  return { totalStock: total, warehouseStock };
}

function buildDimensions(spec) {
  const width = parseNumber(spec['catalog_product_attribute.product_width (inches)']);
  const length = parseNumber(spec['catalog_product_attribute.product_depth (inches)']);
  const height = parseNumber(spec['catalog_product_attribute.product_height (inches)']);
  const weight = parseNumber(spec['catalog_product_attribute.net_weight (lbs)']);

  if (width == null && length == null && height == null && weight == null) return null;

  return {
    width, length, height, weight,
    unitOfMeasureDistance: 'in',
    unitOfMeasureWeight: 'lb',
  };
}

function buildPackaging(spec) {
  const width = parseNumber(spec['catalog_product_attribute.package_width (inches)']);
  const length = parseNumber(spec['catalog_product_attribute.package_depth (inches)']);
  const height = parseNumber(spec['catalog_product_attribute.package_height (inches)']);
  const weight = parseNumber(spec['catalog_product_attribute.gross_weight (lbs)']);
  const cubicFeet = parseNumber(spec['catalog_product_attribute.cubic_feet']);
  const type = spec['catalog_product_attribute.package_type'] || null;
  const pack = spec['catalog_product_attribute.pack'] || null;
  const shipType = spec['catalog_product_attribute.ship_type'] || null;

  return {
    dimensions: (width == null && length == null && height == null) ? null : { width, length, height },
    weight,
    weightUnitOfMeasure: 'lb',
    dimensionsUnitOfMeasure: 'in',
    cubicFeet,
    type,
    pack,
    shipType,
  };
}

function buildAttributes(spec) {
  return [
    buildAttribute('finish', spec['catalog_product_attribute.catalog_finish']),
    buildAttribute('material', spec['catalog_product_attribute.material_detail']),
    buildAttribute('country_of_manufacture', spec['catalog_product_attribute.country_of_manufacture']),
  ].filter(Boolean);
}

/**
 * @param {Object} sheets
 * @param {string|Buffer} sheets.specCsv
 * @param {string|Buffer} sheets.imagesCsv
 * @param {string|Buffer} sheets.priceCsv
 * @param {string|Buffer} sheets.inventoryCsv
 * @returns {Array<{product: Object, variant: Object}>}
 */
export function parseAcmeCatalog({ specCsv, imagesCsv, priceCsv, inventoryCsv }) {
  const specRows = parseCsv(specCsv);
  const imagesBySku = indexBySku(parseCsv(imagesCsv));
  const priceBySku = indexBySku(parseCsv(priceCsv));
  const inventoryBySku = indexBySku(parseCsv(inventoryCsv));

  const records = [];

  for (const spec of specRows) {
    const sku = spec.sku?.trim();
    if (!sku) continue;

    const status = spec['catalog_product_attribute.status']?.trim();
    const isActive = status === 'Enabled';
    const name = spec['catalog_product_attribute.name'];

    const priceRow = priceBySku.get(sku);
    const cost = priceRow ? parseNumber(priceRow['catalog_product_tier_price.catalog_product_tier_price.price']) : null;
    const priceGroup = priceRow?.['catalog_product_tier_price.catalog_product_tier_price.price group'] || null;

    const { mainImage, media } = buildMedia(imagesBySku.get(sku));
    const { totalStock, warehouseStock } = buildInventory(inventoryBySku.get(sku));

    const categoryTokens = (spec['catalog_category_attribute.category'] || '').split(',');
    const { categoryPath, categories } = resolveCategories(categoryTokens, ACME_CATEGORY_MAP);

    const product = {
      source: 'ACME',
      externalId: sku,
      slug: buildSlug(name, sku),
      name,
      description: cleanHtml(spec['catalog_product_attribute.short_description']),
      brand: 'ACME',
      collection: spec['catalog_product_attribute.collection_name'] || null,
      categoryPath,
      categories,
      media,
      mainImage,
      // Base price = cost. Retail markup is applied via StorefrontListing.pricingRule
      // at publish time, not baked in here.
      minPrice: cost,
      maxPrice: cost,
      compareAtPrice: null,
      totalStock,
      isActive,
      specHash: computeSpecHash(spec, imagesBySku.get(sku), priceBySku.get(sku), inventoryBySku.get(sku)),
      externalData: {
        specifications: splitSpecifications(spec['catalog_product_attribute.description']),
        seo: {
          metaTitle: spec['catalog_product_attribute.meta_title'] || null,
          metaDescription: spec['catalog_product_attribute.meta_description'] || null,
          metaKeyword: spec['catalog_product_attribute.meta_keyword'] || null,
        },
        acmeCatalog: spec['catalog_product_attribute.catalog'] || null,
        acmeGroup: spec['catalog_product_attribute.group'] || null,
      },
    };

    const variant = {
      sku,
      status: isActive ? 'Active' : 'Discontinued',
      isActive,
      price: { cost, retailPrice: cost },
      dimensions: buildDimensions(spec),
      packaging: buildPackaging(spec),
      attributes: buildAttributes(spec),
      stockQuantity: totalStock,
      custom: {
        warehouseStock,
        priceGroup,
      },
    };

    records.push({ product, variant });
  }

  return records;
}

/**
 * Lightweight refresh: join just the price + inventory sheets by `sku`.
 * Used for periodic re-uploads that update cost/stock on existing ACME
 * products without touching images/descriptions/dimensions.
 *
 * @param {Object} sheets
 * @param {string|Buffer} sheets.priceCsv
 * @param {string|Buffer} sheets.inventoryCsv
 * @returns {Array<{sku: string, cost: number|null, priceGroup: string|null, totalStock: number, warehouseStock: Object|null}>}
 */
export function parseAcmePriceAndInventory({ priceCsv, inventoryCsv }) {
  const priceRows = parseCsv(priceCsv);
  const inventoryBySku = indexBySku(parseCsv(inventoryCsv));

  const records = [];

  for (const priceRow of priceRows) {
    const sku = priceRow.sku?.trim();
    if (!sku) continue;

    const cost = parseNumber(priceRow['catalog_product_tier_price.catalog_product_tier_price.price']);
    const priceGroup = priceRow['catalog_product_tier_price.catalog_product_tier_price.price group'] || null;
    const { totalStock, warehouseStock } = buildInventory(inventoryBySku.get(sku));

    records.push({ sku, cost, priceGroup, totalStock, warehouseStock });
  }

  return records;
}
