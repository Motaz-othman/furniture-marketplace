import { AdapterType } from './types.js';

/**
 * BaseAdapter - All integrations extend this class
 */
export class BaseAdapter {
  constructor(config) {
    this.code = config.code;             // 'gigab2b', 'shipbob'
    this.name = config.name;             // 'GigaB2B', 'ShipBob'
    this.type = config.type;             // AdapterType.SUPPLIER
    this.version = config.version || '1.0.0';
    this.apiUrl = config.apiUrl || null;
    this.credentials = null;
    this.isConnected = false;
  }

  // ============================================
  // REQUIRED: Must override in each adapter
  // ============================================

  async testConnection() {
    throw new Error(`${this.name}: testConnection() not implemented`);
  }

  getCapabilities() {
    return {
      canImportProducts: false,
      canExportProducts: false,
      canSyncInventory: false,
      canCreateOrders: false,
      canTrackShipments: false,
      canHandleReturns: false,
      canGetRates: false
    };
  }

  // ============================================
  // OPTIONAL: Override as needed
  // ============================================

  async initialize(credentials) {
    this.credentials = credentials;
    this.isConnected = true;
  }

  async disconnect() {
    this.credentials = null;
    this.isConnected = false;
  }

  async handleWebhook(payload, headers) {
    return { received: true };
  }

  getRoutes() {
    return null;
  }

  // ============================================
  // HELPER: For API calls
  // ============================================

  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  async request(method, endpoint, data = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return response.json();
  }
}

export default BaseAdapter;