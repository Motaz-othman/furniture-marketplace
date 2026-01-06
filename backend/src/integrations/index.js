import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Integration Registry - auto-loads all adapters
 */
class IntegrationRegistry {
  constructor() {
    this.adapters = new Map();
  }

  // Register an adapter
  register(adapter) {
    this.adapters.set(adapter.code, adapter);
    console.log(`✅ Registered: ${adapter.name} (${adapter.type})`);
  }

  // Get adapter by code
  get(code) {
    return this.adapters.get(code);
  }

  // Get all adapters
  getAll() {
    return Array.from(this.adapters.values());
  }

  // Get adapters by type
  getByType(type) {
    return this.getAll().filter(a => a.type === type);
  }

  // Get adapter codes
  getCodes() {
    return Array.from(this.adapters.keys());
  }

  // Load all adapters from /adapters folder
  async loadAll() {
    const adaptersPath = path.join(__dirname, 'adapters');
    const files = fs.readdirSync(adaptersPath);

    for (const file of files) {
      // Only load .adapter.js files
      if (!file.endsWith('.adapter.js')) continue;

      try {
        const module = await import(`./adapters/${file}`);
        if (module.default) {
          const adapter = new module.default();
          this.register(adapter);
        }
      } catch (error) {
        console.error(`❌ Failed to load: ${file}`, error.message);
      }
    }

    console.log(`📦 Loaded ${this.adapters.size} integrations`);
    return this;
  }
}

// Singleton instance
export const registry = new IntegrationRegistry();

export default registry;