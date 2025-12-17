import { Router } from 'express';
import { getCustomerProfile, updateCustomerProfile } from './customers.controller.js';

import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createAddressSchema } from '../../shared/utils/validation.js';

const router = Router();

// Customer profile routes
router.get('/profile', authenticate, customerOnly, getCustomerProfile);
router.patch('/profile', authenticate, customerOnly, updateCustomerProfile);


export default router;