import express from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import {
  getProductVariants,
  createVariant,
  updateVariant,
  deleteVariant
} from './variants.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Variant routes
router.get('/products/:productId/variants', getProductVariants);
router.post('/products/:productId/variants', createVariant);
router.put('/variants/:variantId', updateVariant);
router.delete('/variants/:variantId', deleteVariant);

export default router;