import { Router } from 'express';
import { addToWishlist, getWishlist, removeFromWishlist } from './wishlist.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { addToWishlistSchema } from '../../shared/utils/validation.js';

const router = Router();

// All wishlist routes require customer authentication
router.get('/', authenticate, customerOnly, getWishlist);
router.post('/', authenticate, customerOnly, validate(addToWishlistSchema), addToWishlist);
router.delete('/:id', authenticate, customerOnly, removeFromWishlist);

export default router;