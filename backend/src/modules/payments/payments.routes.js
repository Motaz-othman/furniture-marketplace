import { Router } from 'express';
import { createOrderPayment, getPaymentStatus } from './payments.controller.js';
import { handleStripeWebhook } from './webhook.controller.js';
import { processRefund, getRefundDetails } from './refunds.controller.js';
import { getCustomerPaymentHistory, getVendorPaymentHistory, getPaymentDetails } from './history.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// Payment validation schemas
const createPaymentSchema = z.object({
  orderId: z.string().uuid()
});

const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']).optional()
});

// Customer payment routes
router.post('/create-intent', authenticate, customerOnly, validate(createPaymentSchema), createOrderPayment);
router.get('/status/:orderId', authenticate, customerOnly, getPaymentStatus);

// Refund routes (vendor/admin)
router.post('/refund', authenticate, validate(refundSchema), processRefund);
router.get('/refund/:refundId', authenticate, getRefundDetails);

// Payment history routes
router.get('/history/customer', authenticate, customerOnly, getCustomerPaymentHistory);
router.get('/history/vendor', authenticate, getVendorPaymentHistory);
router.get('/history/details/:orderId', authenticate, getPaymentDetails);

// Webhook route (NO authentication, Stripe calls this)
router.post('/webhook', handleStripeWebhook);

export default router;