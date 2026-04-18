import { Router } from 'express';
import {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  bulkCreateListings,
  getRawProducts,
  getRawProductById,
  getRawProductFilters,
} from './listings.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate, adminOnly);

// Browse raw Wondersign products (for selecting which to add)
router.get('/products/filters', getRawProductFilters);
router.get('/products', getRawProducts);
router.get('/products/:id', getRawProductById);

// Storefront listings CRUD
router.get('/', getAllListings);
router.get('/:id', getListingById);
router.post('/', createListing);
router.post('/bulk', bulkCreateListings);
router.patch('/:id', updateListing);
router.delete('/:id', deleteListing);

export default router;
