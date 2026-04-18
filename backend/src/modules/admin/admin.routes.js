// src/modules/admin/admin.routes.js
import { Router } from 'express';
import {
  getPlatformStats,
  getRevenueChart,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  updateVendorRating,
  updateVendorCommission,
  verifyVendor,
  unverifyVendor,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  createShipment,
  updateShipment,
  deleteShipment,
  assignShipmentItems,
  getAllProducts,
  toggleProductActive,
  deleteProduct,
  getAllCategories,
  getRecentActivity,
} from './admin.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  adminUpdateUserSchema,
  adminUpdateVendorStatusSchema,
  adminUpdateVendorRatingSchema,
  adminUpdateVendorCommissionSchema,
  adminUpdateOrderStatusSchema,
  createShipmentSchema,
  updateShipmentSchema,
  assignShipmentItemsSchema,
} from '../../shared/utils/validation.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate, adminOnly);

// ============================================
// DASHBOARD & STATS
// ============================================
router.get('/stats', getPlatformStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/recent-activity', getRecentActivity);

// ============================================
// USER MANAGEMENT
// ============================================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', validate(adminUpdateUserSchema), updateUser);
router.delete('/users/:id', deleteUser);

// ============================================
// VENDOR MANAGEMENT
// ============================================
router.get('/vendors', getAllVendors);
router.get('/vendors/:id', getVendorById);
router.patch('/vendors/:id/status', validate(adminUpdateVendorStatusSchema), updateVendorStatus);
router.patch('/vendors/:id/rating', validate(adminUpdateVendorRatingSchema), updateVendorRating);
router.patch('/vendors/:id/commission', validate(adminUpdateVendorCommissionSchema), updateVendorCommission);
// Keep old endpoints for backwards compatibility
router.patch('/vendors/:id/verify', verifyVendor);
router.patch('/vendors/:id/unverify', unverifyVendor);

// ============================================
// ORDER MANAGEMENT
// ============================================
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', validate(adminUpdateOrderStatusSchema), updateOrderStatus);
router.post('/orders/:id/shipments', validate(createShipmentSchema), createShipment);
router.patch('/orders/:id/shipments/:shipmentId', validate(updateShipmentSchema), updateShipment);
router.delete('/orders/:id/shipments/:shipmentId', deleteShipment);
router.patch('/orders/:id/shipments/:shipmentId/items', validate(assignShipmentItemsSchema), assignShipmentItems);

// ============================================
// PRODUCT MANAGEMENT
// ============================================
router.get('/products', getAllProducts);
router.patch('/products/:id/toggle', toggleProductActive);
router.delete('/products/:id', deleteProduct);

// ============================================
// CATEGORY MANAGEMENT
// ============================================
router.get('/categories', getAllCategories);

export default router;