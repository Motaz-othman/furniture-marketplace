import prisma from '../../shared/config/db.js';

/**
 * Shared order sync handlers - used by all adapters
 */

// Create order in external system
export const createExternalOrder = async (adapter, order) => {
  const mapped = mapOrderToExternal(order);
  
  // Each adapter implements its own API call
  const result = await adapter.createOrder(mapped);
  
  if (result.success) {
    // Update local order with external ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        externalOrderId: result.externalId,
        source: adapter.code.toUpperCase()
      }
    });
  }
  
  return result;
};

// Import orders from external system
export const importOrders = async (adapter, orders, options = {}) => {
  const results = { success: 0, failed: 0, errors: [] };

  for (const order of orders) {
    try {
      const mapped = mapOrderFromExternal(order, adapter.code);
      
      // Check if order already exists
      const existing = await prisma.order.findFirst({
        where: { externalOrderId: mapped.externalOrderId }
      });

      if (!existing) {
        // Create new order logic here
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ order: order.id, error: error.message });
    }
  }

  return results;
};

// Map internal order to external format
export const mapOrderToExternal = (order) => {
  return {
    reference_id: order.orderNumber,
    items: order.items?.map(item => ({
      sku: item.sku || item.productId,
      quantity: item.quantity,
      price: item.price
    })) || [],
    shipping_address: {
      name: order.address?.fullName,
      street: order.address?.street,
      city: order.address?.city,
      state: order.address?.state,
      postal_code: order.address?.postalCode,
      country: order.address?.country
    },
    total: order.total
  };
};

// Map external order to internal format
export const mapOrderFromExternal = (externalOrder, source) => {
  return {
    externalOrderId: String(externalOrder.id),
    source: source.toUpperCase(),
    status: externalOrder.status || 'PENDING',
    total: parseFloat(externalOrder.total) || 0,
    externalData: externalOrder
  };
};

// Get orders by source
export const getOrdersBySource = async (source, options = {}) => {
  const { page = 1, limit = 20 } = options;
  
  return prisma.order.findMany({
    where: { source: source.toUpperCase() },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
};

export default { 
  createExternalOrder, 
  importOrders, 
  mapOrderToExternal, 
  mapOrderFromExternal,
  getOrdersBySource 
};