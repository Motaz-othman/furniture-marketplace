import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} from './addresses.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createAddressSchema } from '../../shared/utils/validation.js';

const router = Router();

// All address routes require customer authentication
router.get('/', authenticate, customerOnly, getAddresses);
router.post('/', authenticate, customerOnly, validate(createAddressSchema), createAddress);
router.patch('/:id', authenticate, customerOnly, validate(createAddressSchema), updateAddress); // ← PATCH
router.delete('/:id', authenticate, customerOnly, deleteAddress);

export default router;