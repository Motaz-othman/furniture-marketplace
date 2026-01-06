import { registry } from './index.js';
import prisma from '../shared/config/db.js';
import { AdapterType } from './core/types.js';

// ============================================
// LIST: Get integrations
// ============================================

export const getAll = async (req, res) => {
  try {
    const adapters = registry.getAll().map(formatAdapter);
    res.json({ integrations: adapters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const adapters = registry.getByType(AdapterType.SUPPLIER).map(formatAdapter);
    res.json({ integrations: adapters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFulfillment = async (req, res) => {
  try {
    const adapters = registry.getByType(AdapterType.FULFILLMENT).map(formatAdapter);
    res.json({ integrations: adapters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getChannels = async (req, res) => {
  try {
    const adapters = registry.getByType(AdapterType.CHANNEL).map(formatAdapter);
    res.json({ integrations: adapters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// SINGLE: Get one integration
// ============================================

export const getOne = async (req, res) => {
  try {
    const { code } = req.params;
    const adapter = registry.get(code);

    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get settings from database
    const settings = await prisma.integrationProvider.findUnique({
      where: { code }
    });

    res.json({ 
      integration: formatAdapter(adapter),
      settings: settings || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// UPDATE: Update settings
// ============================================

export const update = async (req, res) => {
  try {
    const { code } = req.params;
    const { apiKey, apiSecret, settings } = req.body;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const updated = await prisma.integrationProvider.upsert({
      where: { code },
      update: { apiKey, apiSecret, settings, updatedAt: new Date() },
      create: { 
        code, 
        name: adapter.name, 
        type: adapter.type,
        apiKey, 
        apiSecret, 
        settings 
      }
    });

    res.json({ message: 'Settings updated', settings: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// CONNECT / DISCONNECT
// ============================================

export const connect = async (req, res) => {
  try {
    const { code } = req.params;
    const { apiKey, apiSecret } = req.body;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Initialize adapter with credentials
    await adapter.initialize({ apiKey, apiSecret });

    // Save to database
    await prisma.integrationProvider.upsert({
      where: { code },
      update: { apiKey, apiSecret, isActive: true, updatedAt: new Date() },
      create: { 
        code, 
        name: adapter.name, 
        type: adapter.type,
        apiKey, 
        apiSecret, 
        isActive: true 
      }
    });

    res.json({ message: 'Connected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const disconnect = async (req, res) => {
  try {
    const { code } = req.params;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await adapter.disconnect();

    await prisma.integrationProvider.update({
      where: { code },
      data: { isActive: false, updatedAt: new Date() }
    });

    res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// TEST CONNECTION
// ============================================

export const testConnection = async (req, res) => {
  try {
    const { code } = req.params;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await adapter.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// SYNC OPERATIONS
// ============================================

export const syncProducts = async (req, res) => {
  try {
    const { code } = req.params;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!adapter.getCapabilities().canImportProducts) {
      return res.status(400).json({ error: 'Product sync not supported' });
    }

    const result = await adapter.importProducts(req.body);
    
    // Log sync
    await logSync(code, 'PRODUCTS', result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncInventory = async (req, res) => {
  try {
    const { code } = req.params;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!adapter.getCapabilities().canSyncInventory) {
      return res.status(400).json({ error: 'Inventory sync not supported' });
    }

    const result = await adapter.syncInventory(req.body);
    
    await logSync(code, 'INVENTORY', result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncOrders = async (req, res) => {
  try {
    const { code } = req.params;

    const adapter = registry.get(code);
    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!adapter.getCapabilities().canCreateOrders) {
      return res.status(400).json({ error: 'Order sync not supported' });
    }

    const result = await adapter.syncOrders?.(req.body) || { message: 'Not implemented' };
    
    await logSync(code, 'ORDERS', result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// LOGS
// ============================================

export const getLogs = async (req, res) => {
  try {
    const { code } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const logs = await prisma.syncLog.findMany({
      where: { source: code.toUpperCase() },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// HELPERS
// ============================================

const formatAdapter = (adapter) => ({
  code: adapter.code,
  name: adapter.name,
  type: adapter.type,
  version: adapter.version,
  isConnected: adapter.isConnected,
  capabilities: adapter.getCapabilities()
});

const logSync = async (source, type, result) => {
  try {
    await prisma.syncLog.create({
      data: {
        source: source.toUpperCase(),
        type,
        status: result.success !== false ? 'SUCCESS' : 'FAILED',
        itemsTotal: result.total || 0,
        itemsSynced: result.success || 0,
        itemsFailed: result.failed || 0,
        errors: result.errors || null
      }
    });
  } catch (error) {
    console.error('Failed to log sync:', error);
  }
};