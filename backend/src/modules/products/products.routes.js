import { Router } from 'express';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from './products.controller.js';
import { authenticate, vendorOnly, productOwnerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../../shared/utils/validation.js';
import { toggleProductStatus } from './products.controller.js';
import { getVendorProducts } from './products.controller.js';

const router = Router();

// Public routes (anyone can view)
router.get('/', getAllProducts);
router.post('/', authenticate, vendorOnly, validate(createProductSchema), createProduct);


router.patch('/:id/toggle', authenticate, vendorOnly, productOwnerOnly, toggleProductStatus);


router.get('/:id', getProductById);
router.patch('/:id', authenticate, vendorOnly, productOwnerOnly, validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, vendorOnly, productOwnerOnly, deleteProduct);

// Protected routes (vendors only + validation)
router.get('/vendor/my-products', authenticate, vendorOnly, getVendorProducts);



export default router;