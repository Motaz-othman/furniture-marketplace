import { Router } from 'express';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { getSettings, updateSettings, getDeliveryOptions } from './settings.controller.js';

const router = Router();

// Public — storefront reads this
router.get('/', getSettings);
router.get('/delivery-options', getDeliveryOptions);

// Admin only — admin panel writes this
router.put('/', authenticate, adminOnly, updateSettings);

export default router;
