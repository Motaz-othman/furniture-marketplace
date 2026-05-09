/**
 * Sync Service
 *
 * Core sync logic extracted from sync-wondersign.js for reuse by both
 * the CLI script and the admin API.
 */

import cron from 'node-cron';
import prisma from '../config/db.js';
import { fetchProducts, fetchInventory, fetchCategories } from './wondersign.service.js';
import { migrateMediaToS3, migrateImageUrl, clearSyncCache } from './s3.service.js';

// ─── In-memory sync state ──────────────────────────────────────────

let syncState = {
  running: false,
  type: null,       // 'FULL_SYNC' | 'INCREMENTAL_SYNC' | 'SINGLE_PRODUCT'
  startedAt: null,
  progress: null,    // e.g. "Syncing products..."
};

function acquireLock(type) {
  if (syncState.running) {
    throw new Error(`A sync is already running (${syncState.type} started at ${syncState.startedAt})`);
  }
  syncState = { running: true, type, startedAt: new Date().toISOString(), progress: 'Starting...' };
}

function releaseLock() {
  syncState = { running: false, type: null, startedAt: null, progress: null };
}

function setProgress(msg) {
  syncState.progress = msg;
}

export function getSyncStatus() {
  return { ...syncState };
}

// ─── Scheduler ─────────────────────────────────────────────────────

const SCHEDULE_PRESETS = {
  '15m':  { cron: '*/15 * * * *', label: 'Every 15 minutes' },
  '30m':  { cron: '*/30 * * * *', label: 'Every 30 minutes' },
  '1h':   { cron: '0 * * * *',    label: 'Every hour' },
  '2h':   { cron: '0 */2 * * *',  label: 'Every 2 hours' },
  '4h':   { cron: '0 */4 * * *',  label: 'Every 4 hours' },
  '6h':   { cron: '0 */6 * * *',  label: 'Every 6 hours' },
  '12h':  { cron: '0 */12 * * *', label: 'Every 12 hours' },
  '24h':  { cron: '0 0 * * *',    label: 'Once a day (midnight)' },
};

// Two independent schedules
let schedules = {
  incremental: {
    enabled: process.env.SYNC_INCREMENTAL_ENABLED === 'true',
    interval: process.env.SYNC_INCREMENTAL_INTERVAL || '2h',
  },
  full: {
    enabled: process.env.SYNC_FULL_ENABLED === 'true',
    interval: process.env.SYNC_FULL_INTERVAL || '24h',
  },
};

let tasks = { incremental: null, full: null };

function startTask(type) {
  stopTask(type);

  const config = schedules[type];
  const preset = SCHEDULE_PRESETS[config.interval];
  if (!preset) {
    console.error(`[Scheduler] Invalid interval for ${type}: ${config.interval}`);
    return;
  }

  const syncFn = type === 'full' ? runFullSync : runIncrementalSync;

  tasks[type] = cron.schedule(preset.cron, async () => {
    console.log(`[Scheduler] Running ${type} sync (${preset.label})`);
    try {
      await syncFn();
      console.log(`[Scheduler] ${type} sync completed`);
    } catch (err) {
      console.error(`[Scheduler] ${type} sync failed: ${err.message}`);
    }
  });

  console.log(`[Scheduler] ${type} started — ${preset.label}`);
}

function stopTask(type) {
  if (tasks[type]) {
    tasks[type].stop();
    tasks[type] = null;
  }
}

export function getSchedulePresets() {
  return SCHEDULE_PRESETS;
}

export function getScheduleConfig() {
  return {
    incremental: { ...schedules.incremental },
    full: { ...schedules.full },
  };
}

export function updateSchedule({ type, enabled, interval }) {
  if (type !== 'full' && type !== 'incremental') {
    throw new Error('type must be "full" or "incremental"');
  }

  if (interval !== undefined) {
    if (!SCHEDULE_PRESETS[interval]) {
      throw new Error(`Invalid interval. Valid options: ${Object.keys(SCHEDULE_PRESETS).join(', ')}`);
    }
    schedules[type].interval = interval;
  }
  if (enabled !== undefined) {
    schedules[type].enabled = !!enabled;
  }

  if (schedules[type].enabled) {
    startTask(type);
  } else {
    stopTask(type);
  }

  return getScheduleConfig();
}

export function initScheduler() {
  if (schedules.incremental.enabled) startTask('incremental');
  if (schedules.full.enabled) startTask('full');
}

// ─── Helpers ───────────────────────────────────────────────────────

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Sync Categories ──────────────────────────────────────────────

async function syncCategories(rawCategories) {
  const parents = rawCategories.filter(c => c.parentId === null);
  const children = rawCategories.filter(c => c.parentId !== null);
  const idMap = new Map();

  for (const cat of parents) {
    const imageUrl = await migrateImageUrl(cat.imageUrl) || null;
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        imageUrl,
        description: cat.description || null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        imageUrl,
        description: cat.description || null,
        parentId: null,
      }
    });
    idMap.set(cat.id, record.id);
  }

  for (const cat of children) {
    const parentUuid = idMap.get(cat.parentId);
    const imageUrl = await migrateImageUrl(cat.imageUrl) || null;
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        imageUrl,
        parentId: parentUuid || null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        imageUrl,
        parentId: parentUuid || null,
      }
    });
    idMap.set(cat.id, record.id);
  }

  return idMap;
}


// ─── Build inventory lookup ───────────────────────────────────────

function buildInventoryMap(inventoryData) {
  const map = new Map();
  for (const entry of inventoryData) {
    map.set(entry.sku, entry);
  }
  return map;
}

// ─── Resolve category path → internal UUID ────────────────────────

let categorySlugMap = new Map();

function resolveCategoryId(catPath) {
  if (!catPath) return null;
  const segments = catPath.split('/');
  const slug = segments[segments.length - 1];
  return categorySlugMap.get(slug) || null;
}

async function buildCategorySlugMap() {
  const all = await prisma.category.findMany({ select: { id: true, slug: true } });
  categorySlugMap = new Map();
  for (const cat of all) {
    categorySlugMap.set(cat.slug, cat.id);
  }
}

// ─── Sync Products ────────────────────────────────────────────────

async function syncProducts(products, inventoryMap) {
  let created = 0;
  let updated = 0;
  let variantCount = 0;

  for (const apiProduct of products) {
    try {
      const catPath = apiProduct.categories?.[0]?.path;
      const categoryId = resolveCategoryId(catPath);

      const retailPrices = apiProduct.variants.map(v => v.price?.retailPrice).filter(Boolean);
      const msrpPrices = apiProduct.variants.map(v => v.price?.msrpPrice).filter(Boolean);
      const minPrice = retailPrices.length ? Math.min(...retailPrices) : null;
      const maxPrice = retailPrices.length ? Math.max(...retailPrices) : null;
      const maxMsrp = msrpPrices.length ? Math.max(...msrpPrices) : null;
      const isOnSale = minPrice !== null && maxMsrp !== null && minPrice < maxMsrp;
      const compareAtPrice = isOnSale ? maxMsrp : null;

      let totalStock = 0;
      for (const v of apiProduct.variants) {
        const inv = inventoryMap.get(v.sku);
        if (inv) totalStock += inv.availableQuantity;
      }

      const firstVariant = apiProduct.variants[0];
      const isFeatured = firstVariant?.custom?.isFeatured || false;
      const isNew = firstVariant?.custom?.isNew || false;
      const slug = generateSlug(apiProduct.name);
      const externalId = firstVariant?.productId || slug;

      // Migrate images to S3 (no-op when SYNC_IMAGES_TO_S3 !== 'true')
      const media = await migrateMediaToS3(apiProduct.media) || apiProduct.media || null;
      const mainImage = media?.mainImages?.[0]?.url || null;

      const product = await prisma.product.upsert({
        where: {
          externalId_source: { externalId, source: 'WONDERSIGN' }
        },
        update: {
          name: apiProduct.name,
          description: apiProduct.description || '',
          brand: apiProduct.brand || null,
          collection: apiProduct.collection || null,
          provider: apiProduct.provider || null,
          categories: apiProduct.categories || null,
          media,
          relatedProducts: apiProduct.relatedProducts || null,
          variantKey: apiProduct.variantKey || null,
          categoryId: categoryId || null,
          minPrice, maxPrice, compareAtPrice, totalStock, mainImage,
          isFeatured, isNew, isOnSale,
          isActive: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          name: apiProduct.name,
          slug,
          description: apiProduct.description || '',
          brand: apiProduct.brand || null,
          collection: apiProduct.collection || null,
          provider: apiProduct.provider || null,
          categories: apiProduct.categories || null,
          media,
          relatedProducts: apiProduct.relatedProducts || null,
          variantKey: apiProduct.variantKey || null,
          categoryId: categoryId || null,
          minPrice, maxPrice, compareAtPrice, totalStock, mainImage,
          isFeatured, isNew, isOnSale,
          isActive: true,
          source: 'WONDERSIGN',
          externalId,
          lastSyncAt: new Date(),
        }
      });

      for (const v of apiProduct.variants) {
        const inv = inventoryMap.get(v.sku);
        const stockQty = inv?.availableQuantity || 0;

        await prisma.productVariant.upsert({
          where: { externalProductId: v.productId },
          update: {
            name: v.name || null,
            description: v.description || null,
            consumerBrand: v.consumerBrand || null,
            productType: v.productType || null,
            sku: v.sku,
            customerSku: v.customerSku || null,
            upc: v.upc || null,
            status: v.status || 'Active',
            changedState: v.changedState || null,
            isActive: v.status === 'Active',
            isDirectShipping: v.isDirectShipping || false,
            isInCatalog: v.isInCatalog || 'included',
            isPackage: v.isPackage || false,
            isSoldIndividually: v.isSoldIndividually ?? true,
            price: v.price,
            dimensions: v.dimensions || null,
            packaging: v.packaging || null,
            attributes: v.attributes || null,
            options: v.options || null,
            categories: v.categories || null,
            packageProducts: v.packageProducts || null,
            packageProductType: v.packageProductType || null,
            stockQuantity: stockQty,
            rank: v.rank || 0,
            custom: v.custom || null,
            introducedAt: v.introducedAt ? new Date(v.introducedAt) : null,
            deletedAt: v.deletedAt ? new Date(v.deletedAt) : null,
            updatedAt: new Date(),
          },
          create: {
            productId: product.id,
            externalProductId: v.productId,
            name: v.name || null,
            description: v.description || null,
            consumerBrand: v.consumerBrand || null,
            productType: v.productType || null,
            sku: v.sku,
            customerSku: v.customerSku || null,
            upc: v.upc || null,
            status: v.status || 'Active',
            changedState: v.changedState || null,
            isActive: v.status === 'Active',
            isDirectShipping: v.isDirectShipping || false,
            isInCatalog: v.isInCatalog || 'included',
            isPackage: v.isPackage || false,
            isSoldIndividually: v.isSoldIndividually ?? true,
            price: v.price,
            dimensions: v.dimensions || null,
            packaging: v.packaging || null,
            attributes: v.attributes || null,
            options: v.options || null,
            categories: v.categories || null,
            packageProducts: v.packageProducts || null,
            packageProductType: v.packageProductType || null,
            stockQuantity: stockQty,
            rank: v.rank || 0,
            custom: v.custom || null,
            introducedAt: v.introducedAt ? new Date(v.introducedAt) : null,
            deletedAt: v.deletedAt ? new Date(v.deletedAt) : null,
          }
        });
        variantCount++;
      }

      if (product.createdAt.getTime() === product.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`   Failed to sync "${apiProduct.name}": ${err.message}`);
    }
  }

  return { created, updated, variantCount };
}

// ─── Get last successful sync timestamp ──────────────────────────

async function getLastSyncTimestamp() {
  const lastSync = await prisma.syncLog.findFirst({
    where: { source: 'WONDERSIGN', status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, type: true },
  });
  return lastSync?.createdAt || null;
}

// ─── Log sync result ─────────────────────────────────────────────

async function logSync(type, status, stats) {
  await prisma.syncLog.create({
    data: {
      source: 'WONDERSIGN',
      type,
      status,
      itemsTotal: stats.total || 0,
      itemsSynced: stats.synced || 0,
      itemsFailed: stats.failed || 0,
      errors: stats.errors || null,
    }
  });
}

// ─── Run Full Sync ───────────────────────────────────────────────

export async function runFullSync() {
  acquireLock('FULL_SYNC');
  clearSyncCache();
  const startTime = Date.now();

  try {
    setProgress('Fetching data from Wondersign...');
    const [rawProducts, rawInventory, rawCategories] = await Promise.all([
      fetchProducts(),
      fetchInventory(),
      fetchCategories(),
    ]);

    setProgress(`Syncing ${rawCategories.length} categories...`);
    await syncCategories(rawCategories);

    await buildCategorySlugMap();

    const inventoryMap = buildInventoryMap(rawInventory);

    setProgress(`Syncing ${rawProducts.length} products...`);
    const result = await syncProducts(rawProducts, inventoryMap);

    await logSync('FULL_SYNC', 'SUCCESS', {
      total: rawProducts.length,
      synced: rawProducts.length,
      failed: 0,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      type: 'FULL_SYNC',
      status: 'SUCCESS',
      elapsed,
      products: rawProducts.length,
      ...result,
    };
  } catch (err) {
    await logSync('FULL_SYNC', 'FAILED', {
      total: 0, synced: 0, failed: 1,
      errors: { message: err.message },
    });
    throw err;
  } finally {
    releaseLock();
  }
}

// ─── Run Incremental Sync ────────────────────────────────────────

export async function runIncrementalSync() {
  acquireLock('INCREMENTAL_SYNC');
  clearSyncCache();
  const startTime = Date.now();

  try {
    const lastSync = await getLastSyncTimestamp();
    if (!lastSync) {
      // Fall back to full sync
      releaseLock();
      return runFullSync();
    }

    const changedSince = lastSync.toISOString();

    setProgress('Fetching changed products...');
    const [rawProducts, rawInventory] = await Promise.all([
      fetchProducts({ changedSince }),
      fetchInventory(),
    ]);

    if (rawProducts.length === 0) {
      await logSync('INCREMENTAL_SYNC', 'SUCCESS', { total: 0, synced: 0, failed: 0 });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      return { type: 'INCREMENTAL_SYNC', status: 'SUCCESS', elapsed, products: 0, created: 0, updated: 0, variantCount: 0 };
    }

    await buildCategorySlugMap();
    const vendor = await ensureDefaultVendor();
    const inventoryMap = buildInventoryMap(rawInventory);

    setProgress(`Syncing ${rawProducts.length} changed products...`);
    const result = await syncProducts(rawProducts, inventoryMap, vendor.id);

    await logSync('INCREMENTAL_SYNC', 'SUCCESS', {
      total: rawProducts.length,
      synced: rawProducts.length,
      failed: 0,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      type: 'INCREMENTAL_SYNC',
      status: 'SUCCESS',
      elapsed,
      products: rawProducts.length,
      ...result,
    };
  } catch (err) {
    await logSync('INCREMENTAL_SYNC', 'FAILED', {
      total: 0, synced: 0, failed: 1,
      errors: { message: err.message },
    });
    throw err;
  } finally {
    releaseLock();
  }
}

// ─── Sync Single Product ─────────────────────────────────────────

export async function syncSingleProduct(externalId) {
  acquireLock('SINGLE_PRODUCT');
  clearSyncCache();
  const startTime = Date.now();

  try {
    setProgress(`Fetching product ${externalId}...`);

    // Fetch all products and filter (Wondersign API doesn't support single-product fetch)
    // In mock mode this loads all; in live mode we could use changedSince but safer to just fetch all
    const allProducts = await fetchProducts();
    const rawInventory = await fetchInventory();

    // Find the product whose first variant's productId matches externalId
    const targetProduct = allProducts.find(p =>
      p.variants?.some(v => v.productId === externalId)
    );

    if (!targetProduct) {
      throw new Error(`Product with externalId "${externalId}" not found in Wondersign`);
    }

    await buildCategorySlugMap();
    const vendor = await ensureDefaultVendor();
    const inventoryMap = buildInventoryMap(rawInventory);

    setProgress(`Syncing product "${targetProduct.name}"...`);
    const result = await syncProducts([targetProduct], inventoryMap, vendor.id);

    await logSync('SINGLE_PRODUCT', 'SUCCESS', {
      total: 1,
      synced: 1,
      failed: 0,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      type: 'SINGLE_PRODUCT',
      status: 'SUCCESS',
      elapsed,
      products: 1,
      ...result,
    };
  } catch (err) {
    await logSync('SINGLE_PRODUCT', 'FAILED', {
      total: 1, synced: 0, failed: 1,
      errors: { message: err.message },
    });
    throw err;
  } finally {
    releaseLock();
  }
}
