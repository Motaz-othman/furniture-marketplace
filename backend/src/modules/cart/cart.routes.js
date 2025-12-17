import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from './cart.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { addToCartSchema, updateCartSchema } from '../../shared/utils/validation.js';

const router = Router();

// All cart routes require authentication + customer role + validation
router.get('/', authenticate, customerOnly, getCart);
router.post('/', authenticate, customerOnly, validate(addToCartSchema), addToCart);
router.patch('/:id', authenticate, customerOnly, validate(updateCartSchema), updateCartItem); // ← CHANGED PUT to PATCH
router.delete('/:id', authenticate, customerOnly, removeFromCart);
router.delete('/', authenticate, customerOnly, clearCart);

export default router;