import prisma from '../../shared/config/db.js';

/**
 * Shared inventory sync handlers - used by all adapters
 */

// Sync inventory from external system
export const syncInventory = async (adapter, inventoryData) => {
  const results = { success: 0, failed: 0, errors: [] };

  for (const item of inventoryData) {
    try {
      const mapped = mapInventory(item);
      
      // Find product by external ID
      const product = await prisma.product.findFirst({
        where: { 
          externalId: mapped.externalId,
          source: adapter.code.toUpperCase()
        }
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: mapped.quantity,
            lastSyncAt: new Date()
          }
        });
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ item: mapped.externalId, error: 'Product not found' });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ item: item.id, error: error.message });
    }
  }

  return results;
};

// Get stock for single product
export const getProductStock = async (adapter, externalId) => {
  const product = await prisma.product.findFirst({
    where: { 
      externalId: externalId,
      source: adapter.code.toUpperCase()
    },
    select: { 
      id: true, 
      stockQuantity: true, 
      lastSyncAt: true 
    }
  });

  return product;
};

// Map external inventory to internal format
export const mapInventory = (externalInventory) => {
  return {
    externalId: String(externalInventory.id || externalInventory.sku || externalInventory.product_id),
    quantity: parseInt(externalInventory.quantity || externalInventory.stock || 0),
    available: parseInt(externalInventory.available || externalInventory.quantity || 0),
    reserved: parseInt(externalInventory.reserved || 0)
  };
};

// Get low stock products
export const getLowStockProducts = async (source, threshold = 10) => {
  return prisma.product.findMany({
    where: { 
      source: source.toUpperCase(),
      stockQuantity: { lte: threshold }
    },
    orderBy: { stockQuantity: 'asc' }
  });
};

export default { 
  syncInventory, 
  getProductStock, 
  mapInventory,
  getLowStockProducts 
};