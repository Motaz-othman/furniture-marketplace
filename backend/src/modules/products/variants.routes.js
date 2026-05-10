import express from 'express';
import { getProductVariants, getVariantById } from './variants.controller.js';

const router = express.Router();

router.get('/products/:productId/variants', getProductVariants);
router.get('/variants/:variantId', getVariantById);

export default router;
