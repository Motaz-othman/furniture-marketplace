import { Router } from 'express';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { getSettings, updateSettings, getDeliveryOptions, getPricingSettings, updatePricingSettings, recalculateAllPrices } from './settings.controller.js';
import { uploadTaxRates, getTaxRateSummary, lookupTaxRate, lookupZipCode } from './tax.controller.js';

const router = Router();

// Public — storefront reads this
router.get('/', getSettings);
router.get('/delivery-options', getDeliveryOptions);
router.get('/tax-rates/lookup/:zipCode', lookupTaxRate);
router.get('/zip-lookup/:zipCode', lookupZipCode);

// Admin only — admin panel writes this
router.put('/', authenticate, adminOnly, updateSettings);

// Pricing settings — admin only
router.get('/pricing', authenticate, adminOnly, getPricingSettings);
router.put('/pricing', authenticate, adminOnly, updatePricingSettings);
router.post('/pricing/recalculate', authenticate, adminOnly, recalculateAllPrices);

// Tax rates — admin only
router.get('/tax-rates/summary', authenticate, adminOnly, getTaxRateSummary);
router.post('/tax-rates/upload', authenticate, adminOnly, ...uploadTaxRates);

export default router;
