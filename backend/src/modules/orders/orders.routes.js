import { Router } from 'express';
import { createOrder, getCustomerOrders, getOrderById } from './orders.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createOrderSchema } from '../../shared/utils/validation.js';

const router = Router();

router.post('/', authenticate, customerOnly, validate(createOrderSchema), createOrder);
router.get('/customer', authenticate, customerOnly, getCustomerOrders);
router.get('/:id', authenticate, getOrderById);

export default router;
