import { Router } from 'express';
import { createOrderPayment, getPaymentStatus } from './payments.controller.js';
import { processRefund, getRefundDetails } from './refunds.controller.js';
import { getCustomerPaymentHistory, getPaymentDetails } from './history.controller.js';
import { authenticate, customerOnly, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

const createPaymentSchema = z.object({ orderId: z.string().uuid() });
const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']).optional()
});

router.post('/create-intent', authenticate, customerOnly, validate(createPaymentSchema), createOrderPayment);
router.get('/status/:orderId', authenticate, customerOnly, getPaymentStatus);

router.post('/refund', authenticate, adminOnly, validate(refundSchema), processRefund);
router.get('/refund/:refundId', authenticate, adminOnly, getRefundDetails);

router.get('/history/customer', authenticate, customerOnly, getCustomerPaymentHistory);
router.get('/history/details/:orderId', authenticate, getPaymentDetails);

export default router;
