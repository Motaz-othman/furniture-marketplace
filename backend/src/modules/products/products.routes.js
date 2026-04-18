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
  getVendorProducts,
} from './products.controller.js';
import { authenticate, vendorOnly, productOwnerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../../shared/utils/validation.js';

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/slug/:slug', getProductBySlug);

// Vendor routes (must be before /:id to avoid conflict)
router.get('/vendor/my-products', authenticate, vendorOnly, getVendorProducts);

// Public: single product by ID
router.get('/:id', getProductById);

// Protected routes (vendors only)
router.post('/', authenticate, vendorOnly, validate(createProductSchema), createProduct);
router.patch('/:id/toggle', authenticate, vendorOnly, productOwnerOnly, toggleProductStatus);
router.patch('/:id', authenticate, vendorOnly, productOwnerOnly, validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, vendorOnly, productOwnerOnly, deleteProduct);

export default router;
