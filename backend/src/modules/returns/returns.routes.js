import { Router } from 'express';
import { authenticate, customerOnly, adminOnly } from '../../shared/middleware/auth.middleware.js';
import {
  createReturnRequest,
  getOrderReturnRequests,
  listReturnRequests,
  updateReturnRequestStatus,
  refundReturnRequest,
} from './returns.controller.js';

// Customer routes — mounted at /api/orders
export const customerReturnsRouter = Router();
customerReturnsRouter.post('/:orderId/request-return', authenticate, customerOnly, createReturnRequest);
customerReturnsRouter.get('/:orderId/return-requests', authenticate, customerOnly, getOrderReturnRequests);

// Admin routes — mounted at /api/admin/return-requests
export const adminReturnsRouter = Router();
adminReturnsRouter.get('/', authenticate, adminOnly, listReturnRequests);
adminReturnsRouter.patch('/:id', authenticate, adminOnly, updateReturnRequestStatus);
adminReturnsRouter.post('/:id/refund', authenticate, adminOnly, refundReturnRequest);
