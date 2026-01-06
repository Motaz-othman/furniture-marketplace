import prisma from '../../shared/config/db.js';

/**
 * Shared webhook handlers - used by all adapters
 */

// Process incoming webhook
export const processWebhook = async (adapter, payload, headers) => {
  // Log webhook
  const log = await logWebhook(adapter.code, payload, headers);

  // Get event type
  const eventType = getEventType(payload);

  // Route to handler
  switch (eventType) {
    case 'product.created':
    case 'product.updated':
      return handleProductEvent(adapter, payload);
    
    case 'order.created':
    case 'order.updated':
    case 'order.shipped':
      return handleOrderEvent(adapter, payload);
    
    case 'inventory.updated':
      return handleInventoryEvent(adapter, payload);
    
    default:
      return { received: true, event: eventType, processed: false };
  }
};

// Get event type from payload
export const getEventType = (payload) => {
  return payload.event || payload.type || payload.event_type || 'unknown';
};

// Log webhook to database
export const logWebhook = async (source, payload, headers) => {
  try {
    return await prisma.syncLog.create({
      data: {
        source: source.toUpperCase(),
        type: 'WEBHOOK',
        status: 'RECEIVED',
        data: { payload, headers: sanitizeHeaders(headers) }
      }
    });
  } catch (error) {
    console.error('Failed to log webhook:', error);
    return null;
  }
};

// Remove sensitive headers
export const sanitizeHeaders = (headers) => {
  const safe = { ...headers };
  delete safe.authorization;
  delete safe['x-api-key'];
  return safe;
};

// Handle product events
export const handleProductEvent = async (adapter, payload) => {
  // TODO: Implement product sync from webhook
  return { received: true, event: 'product', processed: true };
};

// Handle order events
export const handleOrderEvent = async (adapter, payload) => {
  // TODO: Implement order sync from webhook
  return { received: true, event: 'order', processed: true };
};

// Handle inventory events
export const handleInventoryEvent = async (adapter, payload) => {
  // TODO: Implement inventory sync from webhook
  return { received: true, event: 'inventory', processed: true };
};

export default { 
  processWebhook, 
  getEventType, 
  logWebhook,
  handleProductEvent,
  handleOrderEvent,
  handleInventoryEvent
};