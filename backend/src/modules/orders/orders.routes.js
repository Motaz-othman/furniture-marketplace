import { Router } from 'express';
import {
  createOrder,
  getCustomerOrders,
  getVendorOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} from './orders.controller.js';
import { authenticate, customerOnly, vendorOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../../shared/utils/validation.js';

const router = Router();

// Customer routes
router.post('/', authenticate, customerOnly, validate(createOrderSchema), createOrder);
router.get('/customer', authenticate, customerOnly, getCustomerOrders);
router.patch('/:id/cancel', authenticate, customerOnly, cancelOrder); // ← CHANGED

// Vendor routes
router.get('/vendor', authenticate, vendorOnly, getVendorOrders);
router.patch('/:id/status', authenticate, vendorOnly, validate(updateOrderStatusSchema), updateOrderStatus); // ← CHANGED

// Both can view single order
router.get('/:id', authenticate, getOrderById);

export default router;