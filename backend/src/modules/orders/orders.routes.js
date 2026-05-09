import { Router } from 'express';
import { createOrder, getCustomerOrders, getOrderById, updateOrderStatus, cancelOrder } from './orders.controller.js';
import { authenticate, customerOnly, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../../shared/utils/validation.js';

const router = Router();

router.post('/', authenticate, customerOnly, validate(createOrderSchema), createOrder);
router.get('/customer', authenticate, customerOnly, getCustomerOrders);
router.patch('/:id/cancel', authenticate, customerOnly, cancelOrder);
router.patch('/:id/status', authenticate, adminOnly, validate(updateOrderStatusSchema), updateOrderStatus);
router.get('/:id', authenticate, getOrderById);

export default router;
