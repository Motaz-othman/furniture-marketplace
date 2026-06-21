import prisma from '../../shared/config/db.js';
import {
  getSyncStatus,
  runFullSync,
  runIncrementalSync,
  syncSingleProduct,
  requestStopSync,
  getSchedulePresets,
  getScheduleConfig,
  updateSchedule,
} from '../../shared/services/sync.service.js';

// ─── GET /status ─────────────────────────────────────────────────

export const getStatus = async (req, res) => {
  try {
    const status = getSyncStatus();

    // Also get last successful sync info
    const lastSync = await prisma.syncLog.findFirst({
      where: { source: 'WONDERSIGN', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: {
        ...status,
        lastSync: lastSync ? {
          type: lastSync.type,
          completedAt: lastSync.createdAt,
          itemsSynced: lastSync.itemsSynced,
          itemsFailed: lastSync.itemsFailed,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
};

// ─── GET /logs ───────────────────────────────────────────────────

export const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = { source: 'WONDERSIGN' };

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
    console.error('Get sync logs error:', error);
    res.status(500).json({ error: 'Failed to get sync logs' });
  }
};

// ─── POST /trigger ───────────────────────────────────────────────

export const triggerSync = async (req, res) => {
  try {
    const { type = 'incremental' } = req.body;

    // Fire and forget — respond immediately, sync runs in background
    res.json({ message: `${type} sync started` });

    if (type === 'full') {
      runFullSync().catch(err => console.error('Background full sync failed:', err.message));
    } else {
      runIncrementalSync().catch(err => console.error('Background incremental sync failed:', err.message));
    }
  } catch (error) {
    console.error('Trigger sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger sync' });
  }
};

// ─── POST /trigger/product/:externalId ───────────────────────────

export const triggerProductSync = async (req, res) => {
  try {
    const { externalId } = req.params;

    // Fire and forget
    res.json({ message: `Single product sync started for ${externalId}` });

    syncSingleProduct(externalId).catch(err =>
      console.error(`Background single product sync failed for ${externalId}:`, err.message)
    );
  } catch (error) {
    console.error('Trigger product sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger product sync' });
  }
};

// ─── POST /stop ──────────────────────────────────────────────────

export const stopSync = (req, res) => {
  try {
    requestStopSync();
    res.json({ message: 'Stop requested — sync will halt after the current product' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request stop' });
  }
};

// ─── GET /schedule ──────────────────────────────────────────────

export const getSchedule = (req, res) => {
  try {
    res.json({
      data: {
        config: getScheduleConfig(),
        presets: getSchedulePresets(),
      },
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
};

// ─── PATCH /schedule ────────────────────────────────────────────

export const patchSchedule = (req, res) => {
  try {
    const { enabled, interval, type } = req.body;
    const updated = updateSchedule({ enabled, interval, type });
    res.json({ message: 'Schedule updated', data: updated });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(400).json({ error: error.message || 'Failed to update schedule' });
  }
};
