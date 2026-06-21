/**
 * Vendor catalog import service.
 *
 * Consumes the normalized { product, variant } records produced by the
 * vendor adapters (acme.adapter.js, globalFurniture.adapter.js) and
 * upserts them into Product/ProductVariant — the same tables the
 * Wondersign sync writes to, distinguished by `source` ("ACME"/"GFW").
 *
 * Mirrors the lock/progress/SyncLog pattern from sync.service.js so the
 * admin panel's sync-status UI works the same way for vendor imports.
 */

import prisma from '../config/db.js';
import { migrateMediaToS3, clearSyncCache } from './s3.service.js';
import { parseAcmePriceAndInventory } from '../adapters/acme.adapter.js';
import { fetchCollectionImages } from '../adapters/gfwDropboxAssets.js';

// ─── Lock / progress state ────────────────────────────────────────

let importState = { running: false, type: null, startedAt: null, progress: null };

function acquireLock(type) {
  if (importState.running) {
    throw new Error(`An import is already running (${importState.type} started at ${importState.startedAt})`);
  }
  importState = { running: true, type, startedAt: new Date().toISOString(), progress: 'Starting...' };
}

function releaseLock() {
  importState = { running: false, type: null, startedAt: null, progress: null };
}

function setProgress(msg) {
  importState.progress = msg;
}

export function getImportStatus() {
  return { ...importState };
}

// ─── GFW Dropbox sync state ───────────────────────────────────────

let dropboxSyncState = { running: false, startedAt: null, progress: null, lastRun: null };

export function getDropboxSyncStatus() {
  return { ...dropboxSyncState };
}

export async function syncGfwDropboxAssets() {
  if (dropboxSyncState.running) {
    throw new Error('GFW Dropbox sync already running');
  }

  dropboxSyncState = { running: true, startedAt: new Date().toISOString(), progress: 'Loading unsynced products...', lastRun: dropboxSyncState.lastRun };

  try {
    // Query all GFW products from DB that haven't been Dropbox-synced yet
    const allProducts = await prisma.product.findMany({
      where: { source: 'GFW' },
      select: {
        id: true,
        media: true,
        externalData: true,
        variants: { select: { sku: true } },
      },
    });

    const unsynced = allProducts.filter(p => !p.externalData?.dropboxSynced);

    if (unsynced.length === 0) {
      dropboxSyncState = { running: false, startedAt: dropboxSyncState.startedAt, progress: 'All products already synced.', lastRun: new Date().toISOString() };
      console.log('[GFW Dropbox] All products already synced — nothing to do.');
      return { synced: 0, skipped: allProducts.length };
    }

    console.log(`[GFW Dropbox] ${unsynced.length} unsynced products across ${allProducts.length} total.`);
    dropboxSyncState.progress = `Fetching Dropbox assets for ${unsynced.length} products...`;

    // Reconstruct the records format fetchCollectionImages expects
    const records = unsynced.flatMap(p =>
      (p.variants || []).map(v => ({
        product: { externalData: p.externalData, media: p.media },
        variant: { sku: v.sku },
      }))
    );

    const extraImagesMap = await fetchCollectionImages(records, (done, total, folderUrl) => {
      const name = folderUrl
        ? new URL(folderUrl).pathname.split('/').filter(Boolean).pop() || 'folder'
        : 'folder';
      dropboxSyncState.progress = `Dropbox: ${done}/${total} folders — ${name}`;
    });

    dropboxSyncState.progress = 'Applying assets to products...';
    let patched = 0;

    for (const [sku, assets] of extraImagesMap) {
      try {
        const variant = await prisma.productVariant.findUnique({
          where: { sku },
          include: { product: { select: { id: true, media: true, externalData: true } } },
        });
        if (!variant?.product) continue;

        const { id: productId, media, externalData } = variant.product;
        const updatedMedia = media || {};

        if (assets.images?.length) {
          updatedMedia.additionalImages = [
            ...(updatedMedia.additionalImages || []),
            ...assets.images.map(url => ({ url })),
          ];
        }

        await prisma.product.update({
          where: { id: productId },
          data: {
            media: updatedMedia,
            externalData: {
              ...(externalData || {}),
              dropboxSynced: true,
              ...(assets.lineDrawingUrl ? { lineDrawingUrl: assets.lineDrawingUrl } : {}),
              ...(assets.assemblyUrl    ? { assemblyUrl:    assets.assemblyUrl    } : {}),
            },
          },
        });
        patched++;
      } catch (err) {
        console.error(`[GFW Dropbox] Failed to patch ${sku}: ${err.message}`);
      }
    }

    // Mark all products with a vendorAssetsLink but zero results as synced
    // so they don't get re-attempted on every run
    const skusPatched = new Set(extraImagesMap.keys());
    for (const p of unsynced) {
      const hasLink = p.externalData?.vendorAssetsLink;
      if (!hasLink) continue;
      for (const v of p.variants || []) {
        if (skusPatched.has(v.sku)) continue;
        await prisma.product.update({
          where: { id: p.id },
          data: { externalData: { ...(p.externalData || {}), dropboxSynced: true } },
        }).catch(() => {});
      }
    }

    const summary = `Done. ${patched} products updated, ${allProducts.length - unsynced.length} already had assets.`;
    dropboxSyncState = { running: false, startedAt: dropboxSyncState.startedAt, progress: summary, lastRun: new Date().toISOString() };
    console.log(`[GFW Dropbox] ${summary}`);

    return { synced: patched, skipped: allProducts.length - unsynced.length };
  } catch (err) {
    dropboxSyncState = { running: false, startedAt: dropboxSyncState.startedAt, progress: `Failed: ${err.message}`, lastRun: new Date().toISOString() };
    console.error('[GFW Dropbox] Sync failed:', err.message);
    throw err;
  }
}

// ─── Category resolution (used only by runVendorImport) ──────────

let categorySlugMap = new Map();

async function buildCategorySlugMap() {
  const all = await prisma.category.findMany({ select: { id: true, slug: true } });
  categorySlugMap = new Map();
  for (const cat of all) {
    categorySlugMap.set(cat.slug, cat.id);
  }
}

function resolveCategoryId(categoryPath) {
  if (!categoryPath) return null;
  const segments = categoryPath.split('/');
  const slug = segments[segments.length - 1];
  return categorySlugMap.get(slug) || null;
}

// ─── Upsert a single { product, variant } record ──────────────────

async function upsertRecord({ product: p, variant: v }, source, extraImagesMap) {
  // Look up existing first — needed for hash check before any expensive S3 work.
  let existing = await prisma.product.findUnique({
    where: { externalId_source: { externalId: p.externalId, source } },
  });
  if (!existing) {
    existing = await prisma.product.findUnique({ where: { slug: p.slug } });
  }

  // Never create a product that ACME already has as Disabled — only deactivate ones we previously imported.
  if (!p.isActive && !existing) return 'skipped';

  // Skip if nothing changed since last import.
  // For multi-variant products (e.g. UW rugs) the same product appears once per variant
  // in the records list. If the product hash matches we skip the expensive product update,
  // but still create the variant if it doesn't exist yet so all variants are imported.
  if (existing && p.specHash && existing.externalData?.specHash === p.specHash) {
    const existingVariant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });
    if (existingVariant) return 'skipped';

    await prisma.productVariant.create({
      data: {
        productId: existing.id,
        sku: v.sku,
        upc: v.upc || null,
        status: v.status,
        isActive: v.isActive,
        price: v.price,
        dimensions: v.dimensions,
        packaging: v.packaging,
        attributes: v.attributes,
        packageProducts: v.packageProducts || null,
        packageProductType: v.packageProductType || null,
        isPackage: v.isPackage || false,
        stockQuantity: v.stockQuantity || 0,
        custom: v.custom || null,
      },
    });
    return 'updated';
  }

  const categoryId = resolveCategoryId(p.categoryPath);
  const media = await migrateMediaToS3(p.media) || p.media || null;
  const mainImage = media?.mainImages?.[0]?.url || p.mainImage || null;

  const extraAssets = extraImagesMap?.get(v.sku);
  if (media && extraAssets?.images?.length) {
    media.additionalImages = [...(media.additionalImages || []), ...extraAssets.images.map(url => ({ url }))];
  }

  const acmeStatus = source === 'ACME' ? (p.isActive ? 'ACTIVE' : 'DISABLED') : undefined;

  const externalData = {
    ...(p.externalData || {}),
    specHash: p.specHash || null,
    ...(extraAssets?.lineDrawingUrl ? { lineDrawingUrl: extraAssets.lineDrawingUrl } : {}),
    ...(extraAssets?.assemblyUrl    ? { assemblyUrl:    extraAssets.assemblyUrl    } : {}),
  };

  const productData = {
    name: p.name,
    description: p.description || '',
    brand: p.brand || null,
    collection: p.collection || null,
    categories: p.categories || null,
    media,
    categoryId,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    compareAtPrice: p.compareAtPrice ?? null,
    totalStock: p.totalStock || 0,
    mainImage,
    isActive: p.isActive,
    source,
    externalId: p.externalId,
    externalData,
    lastSyncAt: new Date(),
    ...(acmeStatus !== undefined && { acmeStatus }),
  };

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: productData })
    : await prisma.product.create({ data: { ...productData, slug: p.slug } });

  // If the product was just deactivated, remove any storefront listing so it
  // disappears from the live store immediately.
  if (!p.isActive && existing) {
    await prisma.storefrontListing.deleteMany({ where: { productId: product.id } });
    const { invalidateListingCache } = await import('../../../modules/products/products.controller.js');
    invalidateListingCache();
  }

  const variantData = {
    productId: product.id,
    sku: v.sku,
    upc: v.upc || null,
    status: v.status,
    isActive: v.isActive,
    price: v.price,
    dimensions: v.dimensions,
    packaging: v.packaging,
    attributes: v.attributes,
    packageProducts: v.packageProducts || null,
    packageProductType: v.packageProductType || null,
    isPackage: v.isPackage || false,
    stockQuantity: v.stockQuantity || 0,
    custom: v.custom || null,
  };

  const existingVariant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });
  if (existingVariant) {
    await prisma.productVariant.update({ where: { id: existingVariant.id }, data: variantData });
  } else {
    await prisma.productVariant.create({ data: variantData });
  }

  return existing ? 'updated' : 'created';
}

// ─── Run a full vendor import ──────────────────────────────────────

/**
 * @param {string} source - "ACME" or "GFW"
 * @param {Array<{product: Object, variant: Object}>} records
 */
export async function runVendorImport(source, records) {
  acquireLock(`${source}_IMPORT`);
  clearSyncCache();
  const startTime = Date.now();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const seenExternalIds = new Set(records.map(r => r.product.externalId));

  try {
    await buildCategorySlugMap();

    // Phase 1: upsert all products immediately (no Dropbox images yet)
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      setProgress(`Importing ${i + 1}/${records.length}: ${record.product.name}`);

      try {
        const result = await upsertRecord(record, source, null);
        if (result === 'created') created++;
        else if (result === 'updated') updated++;
        else skipped++;
      } catch (err) {
        failed++;
        errors.push({ sku: record.variant.sku, name: record.product.name, message: err.message });
        console.error(`[VendorImport:${source}] Failed "${record.product.name}" (${record.variant.sku}): ${err.message}`);
      }
    }

    // Phase 2 (GFW only): fire Dropbox asset sync in background — does not block the import response
    if (source === 'GFW') {
      syncGfwDropboxAssets().catch(err => console.error('[GFW Dropbox Auto-sync]', err.message));
    }

    // ACME spec sheet is always the full catalog — any product missing from this
    // upload has been removed by ACME and should be deactivated.
    let deactivated = 0;
    if (source === 'ACME') {
      setProgress('Deactivating removed products...');
      const toDeactivate = await prisma.product.findMany({
        where: { source: 'ACME', isActive: true, externalId: { notIn: [...seenExternalIds] } },
        select: { id: true, externalData: true },
      });
      if (toDeactivate.length) {
        const ids = toDeactivate.map((p) => p.id);
        await prisma.storefrontListing.deleteMany({ where: { productId: { in: ids } } });
        await Promise.all(toDeactivate.map((p) =>
          prisma.product.update({
            where: { id: p.id },
            data: { isActive: false, acmeStatus: 'REMOVED', externalData: { ...(p.externalData || {}) } },
          })
        ));
        deactivated = ids.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    await prisma.syncLog.create({
      data: {
        source,
        type: 'FULL_SYNC',
        status: 'SUCCESS',
        itemsTotal: records.length,
        itemsSynced: created + updated,
        itemsFailed: failed,
        errors: errors.length ? { errors } : null,
        data: { skipped, deactivated },
      },
    });

    return { source, status: 'SUCCESS', elapsed, total: records.length, created, updated, skipped, deactivated, failed, errors };
  } catch (err) {
    await prisma.syncLog.create({
      data: {
        source,
        type: 'FULL_SYNC',
        status: 'FAILED',
        itemsTotal: records.length,
        itemsSynced: created + updated,
        itemsFailed: failed,
        errors: { message: err.message },
      },
    });
    throw err;
  } finally {
    releaseLock();
  }
}

// ─── Run an ACME price/inventory refresh ───────────────────────────

/**
 * Lightweight refresh: updates cost + stock on existing ACME variants
 * from the price + inventory sheets only. Does not create new products —
 * SKUs not yet imported are skipped (run a full import to pick those up).
 *
 * @param {Object} sheets
 * @param {string|Buffer} sheets.priceCsv
 * @param {string|Buffer} sheets.inventoryCsv
 */
export async function refreshAcmePricing({ priceCsv, inventoryCsv }) {
  acquireLock('ACME_REFRESH');
  const startTime = Date.now();

  const records = parseAcmePriceAndInventory({ priceCsv, inventoryCsv });

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  try {
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      setProgress(`Refreshing ${i + 1}/${records.length}: ${rec.sku}`);

      try {
        if (rec.cost == null) {
          skipped++;
          continue;
        }

        const variant = await prisma.productVariant.findUnique({
          where: { sku: rec.sku },
          include: { product: { select: { id: true, source: true } } },
        });

        if (!variant || variant.product.source !== 'ACME') {
          skipped++;
          continue;
        }

        const price = { ...(variant.price || {}), cost: rec.cost, retailPrice: rec.cost };
        const custom = { ...(variant.custom || {}), warehouseStock: rec.warehouseStock, priceGroup: rec.priceGroup };

        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { price, custom, stockQuantity: rec.totalStock },
        });

        // Recompute product-level aggregates across all of its variants
        // (currently 1:1, but safe if SKUs are ever merged into one product).
        const siblings = await prisma.productVariant.findMany({
          where: { productId: variant.productId },
          select: { price: true, stockQuantity: true },
        });
        const retailPrices = siblings.map(s => s.price?.retailPrice).filter(p => p != null);
        const totalStock = siblings.reduce((sum, s) => sum + (s.stockQuantity || 0), 0);

        await prisma.product.update({
          where: { id: variant.productId },
          data: {
            minPrice: retailPrices.length ? Math.min(...retailPrices) : null,
            maxPrice: retailPrices.length ? Math.max(...retailPrices) : null,
            totalStock,
            lastSyncAt: new Date(),
          },
        });

        updated++;
      } catch (err) {
        failed++;
        errors.push({ sku: rec.sku, message: err.message });
        console.error(`[VendorImport:ACME_REFRESH] Failed "${rec.sku}": ${err.message}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    await prisma.syncLog.create({
      data: {
        source: 'ACME',
        type: 'PRICE_REFRESH',
        status: 'SUCCESS',
        itemsTotal: records.length,
        itemsSynced: updated,
        itemsFailed: failed,
        errors: errors.length ? { errors } : null,
        data: { skipped },
      },
    });

    return { source: 'ACME', status: 'SUCCESS', elapsed, total: records.length, updated, skipped, failed, errors };
  } catch (err) {
    await prisma.syncLog.create({
      data: {
        source: 'ACME',
        type: 'PRICE_REFRESH',
        status: 'FAILED',
        itemsTotal: records.length,
        itemsSynced: updated,
        itemsFailed: failed,
        errors: { message: err.message },
      },
    });
    throw err;
  } finally {
    releaseLock();
  }
}
