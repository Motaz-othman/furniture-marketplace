import { Router } from 'express';
import {
  getPlatformStats,
  getRevenueChart,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
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
  getCustomers,
  getCustomerDetail,
} from './admin.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  adminUpdateUserSchema,
  adminUpdateOrderStatusSchema,
  createShipmentSchema,
  updateShipmentSchema,
  assignShipmentItemsSchema,
} from '../../shared/utils/validation.js';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/stats', getPlatformStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/recent-activity', getRecentActivity);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', validate(adminUpdateUserSchema), updateUser);
router.delete('/users/:id', deleteUser);

router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', validate(adminUpdateOrderStatusSchema), updateOrderStatus);
router.post('/orders/:id/shipments', validate(createShipmentSchema), createShipment);
router.patch('/orders/:id/shipments/:shipmentId', validate(updateShipmentSchema), updateShipment);
router.delete('/orders/:id/shipments/:shipmentId', deleteShipment);
router.patch('/orders/:id/shipments/:shipmentId/items', validate(assignShipmentItemsSchema), assignShipmentItems);

router.get('/products', getAllProducts);
router.patch('/products/:id/toggle', toggleProductActive);
router.delete('/products/:id', deleteProduct);

router.get('/categories', getAllCategories);

router.get('/customers',     getCustomers);
router.get('/customers/:id', getCustomerDetail);

export default router;
