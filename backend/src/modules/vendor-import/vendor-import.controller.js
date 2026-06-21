import prisma from '../../shared/config/db.js';
import { parseAcmeCatalog } from '../../shared/adapters/acme.adapter.js';
import { parseGlobalFurnitureCatalog } from '../../shared/adapters/globalFurniture.adapter.js';
import { parseUnitedWeaversRugs } from '../../shared/adapters/unitedweavers.adapter.js';
import { runVendorImport, refreshAcmePricing, getImportStatus, syncGfwDropboxAssets, getDropboxSyncStatus } from '../../shared/services/vendorImport.service.js';
import { toCSVBuffer } from '../../shared/adapters/excelToCSV.js';

function buf(file) {
  return toCSVBuffer(file.buffer, file.originalname);
}

// ─── GET /status ────────────────────────────────────────────────

export const getStatus = async (req, res) => {
  try {
    const status = getImportStatus();

    const lastLogs = await prisma.syncLog.findMany({
      where: { source: { in: ['ACME', 'GFW', 'UW'] }, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      distinct: ['source', 'type'],
      take: 10,
    });

    res.json({
      data: {
        ...status,
        dropboxSync: getDropboxSyncStatus(),
        lastSyncs: lastLogs.map(log => ({
          source: log.source,
          type: log.type,
          completedAt: log.createdAt,
          itemsSynced: log.itemsSynced,
          itemsFailed: log.itemsFailed,
        })),
      },
    });
  } catch (error) {
    console.error('Get vendor import status error:', error);
    res.status(500).json({ error: 'Failed to get import status' });
  }
};

// ─── POST /gfw/dropbox-sync ──────────────────────────────────────

export const triggerGfwDropboxSync = async (req, res) => {
  try {
    res.json({ message: 'GFW Dropbox sync started' });
    syncGfwDropboxAssets().catch(err => console.error('[GFW Dropbox Manual]', err.message));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── GET /logs ──────────────────────────────────────────────────

export const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, source } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = { source: source ? source : { in: ['ACME', 'GFW', 'UW'] } };

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.syncLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get vendor import logs error:', error);
    res.status(500).json({ error: 'Failed to get import logs' });
  }
};

// ─── POST /acme/import ──────────────────────────────────────────

export const importAcme = async (req, res) => {
  try {
    const files = req.files || {};
    const required = ['specCsv', 'imagesCsv', 'priceCsv', 'inventoryCsv'];
    const missing = required.filter(field => !files[field]?.[0]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required file(s): ${missing.join(', ')}` });
    }

    const records = parseAcmeCatalog({
      specCsv: buf(files.specCsv[0]),
      imagesCsv: buf(files.imagesCsv[0]),
      priceCsv: buf(files.priceCsv[0]),
      inventoryCsv: buf(files.inventoryCsv[0]),
    });

    if (!records.length) {
      return res.status(400).json({ error: 'No active rows found in the uploaded sheets' });
    }

    // Fire and forget — import runs in the background, poll /status for progress.
    res.json({ message: `ACME import started for ${records.length} products` });

    runVendorImport('ACME', records).catch(err => console.error('Background ACME import failed:', err.message));
  } catch (error) {
    console.error('ACME import error:', error);
    res.status(400).json({ error: error.message || 'Failed to start ACME import' });
  }
};

// ─── POST /acme/refresh ──────────────────────────────────────────

export const refreshAcme = async (req, res) => {
  try {
    const files = req.files || {};
    const required = ['priceCsv', 'inventoryCsv'];
    const missing = required.filter(field => !files[field]?.[0]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required file(s): ${missing.join(', ')}` });
    }

    res.json({ message: 'ACME price/inventory refresh started' });

    refreshAcmePricing({
      priceCsv: buf(files.priceCsv[0]),
      inventoryCsv: buf(files.inventoryCsv[0]),
    }).catch(err => console.error('Background ACME refresh failed:', err.message));
  } catch (error) {
    console.error('ACME refresh error:', error);
    res.status(400).json({ error: error.message || 'Failed to start ACME refresh' });
  }
};

// ─── DELETE /gfw/products ─────────────────────────────────────────

export const clearGlobalFurnitureProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { source: 'GFW' },
      select: { id: true },
    });
    const ids = products.map(p => p.id);

    if (!ids.length) {
      return res.json({ message: 'No Global Furniture products found', deleted: 0 });
    }

    await prisma.$transaction([
      prisma.storefrontListing.deleteMany({ where: { productId: { in: ids } } }),
      prisma.orderItem.deleteMany({ where: { productId: { in: ids } } }),
      prisma.productVariant.deleteMany({ where: { productId: { in: ids } } }),
      prisma.product.deleteMany({ where: { source: 'GFW' } }),
    ]);

    res.json({ message: `Deleted ${ids.length} Global Furniture products`, deleted: ids.length });
  } catch (error) {
    console.error('Clear GFW products error:', error);
    res.status(500).json({ error: error.message || 'Failed to clear Global Furniture products' });
  }
};

// ─── POST /gfw/import ────────────────────────────────────────────

export const importGlobalFurniture = async (req, res) => {
  try {
    const files = req.files || {};
    const missing = ['dataCsv', 'inventoryCsv'].filter(f => !files[f]?.[0]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required file(s): ${missing.join(', ')}` });
    }

    const records = parseGlobalFurnitureCatalog({
      dataCsv: buf(files.dataCsv[0]),
      inventoryCsv: buf(files.inventoryCsv[0]),
    });

    if (!records.length) {
      return res.status(400).json({ error: 'No rows found in the uploaded sheet' });
    }

    res.json({ message: `Global Furniture import started for ${records.length} products` });

    runVendorImport('GFW', records).catch(err => console.error('Background GFW import failed:', err.message));
  } catch (error) {
    console.error('GFW import error:', error);
    res.status(400).json({ error: error.message || 'Failed to start Global Furniture import' });
  }
};

// ─── POST /uw/import ─────────────────────────────────────────────────────────

export const importUnitedWeavers = async (req, res) => {
  try {
    const files = req.files || {};
    const missing = ['catalogCsv', 'inventoryCsv'].filter(f => !files[f]?.[0]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required file(s): ${missing.join(', ')}` });
    }

    const records = parseUnitedWeaversRugs({
      catalogCsv: buf(files.catalogCsv[0]),
      inventoryCsv: buf(files.inventoryCsv[0]),
    });

    if (!records.length) {
      return res.status(400).json({ error: 'No product rows found in the uploaded catalog' });
    }

    res.json({ message: `United Weavers import started for ${records.length} variants` });

    runVendorImport('UW', records).catch(err => console.error('Background UW import failed:', err.message));
  } catch (error) {
    console.error('UW import error:', error);
    res.status(400).json({ error: error.message || 'Failed to start United Weavers import' });
  }
};
