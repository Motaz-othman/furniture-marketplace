// Integration Types
export const AdapterType = {
    SUPPLIER: 'supplier',       // GigaB2B, wholesalers - source products
    FULFILLMENT: 'fulfillment', // ShipBob, ShipMonk - 3PL, shipping
    CHANNEL: 'channel'          // Amazon, Noon - sales channels
  };
  
  // Sync Types
  export const SyncType = {
    PRODUCTS: 'products',
    INVENTORY: 'inventory',
    ORDERS: 'orders',
    TRACKING: 'tracking'
  };
  
  // Sync Status
  export const SyncStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    PARTIAL: 'partial'
  };
  
  // Connection Status
  export const ConnectionStatus = {
    DISCONNECTED: 'disconnected',
    CONNECTED: 'connected',
    ERROR: 'error'
  };
  
  export default {
    AdapterType,
    SyncType,
    SyncStatus,
    ConnectionStatus
  };