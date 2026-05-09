import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  getProductBySlug,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from './products.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../../shared/utils/validation.js';

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Admin-only write routes
router.post('/', authenticate, adminOnly, validate(createProductSchema), createProduct);
router.patch('/:id/toggle', authenticate, adminOnly, toggleProductStatus);
router.patch('/:id', authenticate, adminOnly, validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, adminOnly, deleteProduct);

export default router;
