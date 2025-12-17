import { Router } from 'express';
import { 
  updateVendorProfile, 
  getVendorProfile,
  getAllVendors,
  getVendorById,
  getVendorStats,
  getVendorProducts,
  getVendorStatistics
} from './vendors.controller.js';
import { authenticate, vendorOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { updateVendorProfileSchema } from '../../shared/utils/validation.js';

import { connectStripeAccount, getStripeAccountStatus, disconnectStripeAccount, getStripeDashboardLink } from './connect.controller.js';

const router = Router();

// Protected routes FIRST (most specific)
router.get('/profile', authenticate, vendorOnly, getVendorProfile);
router.patch('/profile', authenticate, vendorOnly, validate(updateVendorProfileSchema), updateVendorProfile); // ← CHANGED PUT to PATCH
router.get('/stats', authenticate, vendorOnly, getVendorStats);

router.get('/products', authenticate, vendorOnly, getVendorProducts);
router.get('/statistics', authenticate, vendorOnly, getVendorStatistics);

// Stripe Connect routes
router.post('/connect/stripe', authenticate, vendorOnly, connectStripeAccount);
router.get('/connect/status', authenticate, vendorOnly, getStripeAccountStatus);
router.delete('/connect/stripe', authenticate, vendorOnly, disconnectStripeAccount);
router.get('/connect/dashboard', authenticate, vendorOnly, getStripeDashboardLink);

// Public routes AFTER (less specific)
router.get('/', getAllVendors);
router.get('/:id', getVendorById);

export default router;