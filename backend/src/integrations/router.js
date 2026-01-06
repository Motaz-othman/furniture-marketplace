import { Router } from 'express';
import { authenticate, adminOnly } from '../shared/middleware/auth.middleware.js';
import { registry } from './index.js';
import * as controller from './controller.js';
import * as webhookHandler from './handlers/webhook.handler.js';

const router = Router();

// ============================================
// LIST: All integrations
// ============================================
router.get('/', authenticate, adminOnly, controller.getAll);

// ============================================
// BY TYPE: Filter by type
// ============================================
router.get('/suppliers', authenticate, adminOnly, controller.getSuppliers);
router.get('/fulfillment', authenticate, adminOnly, controller.getFulfillment);
router.get('/channels', authenticate, adminOnly, controller.getChannels);

// ============================================
// SINGLE: Manage specific integration
// ============================================
router.get('/:code', authenticate, adminOnly, controller.getOne);
router.put('/:code', authenticate, adminOnly, controller.update);
router.post('/:code/connect', authenticate, adminOnly, controller.connect);
router.post('/:code/disconnect', authenticate, adminOnly, controller.disconnect);
router.post('/:code/test', authenticate, adminOnly, controller.testConnection);

// ============================================
// SYNC: Trigger sync operations
// ============================================
router.post('/:code/sync/products', authenticate, adminOnly, controller.syncProducts);
router.post('/:code/sync/inventory', authenticate, adminOnly, controller.syncInventory);
router.post('/:code/sync/orders', authenticate, adminOnly, controller.syncOrders);

// ============================================
// LOGS: View sync history
// ============================================
router.get('/:code/logs', authenticate, adminOnly, controller.getLogs);

// ============================================
// WEBHOOKS: Receive from external services
// ============================================
router.post('/webhooks/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const adapter = registry.get(code);

    if (!adapter) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await adapter.handleWebhook(req.body, req.headers);
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

export default router;