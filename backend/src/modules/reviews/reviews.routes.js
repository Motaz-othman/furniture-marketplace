import { Router } from 'express';
import { 
  createReview, 
  getProductReviews, 
  updateReview, 
  deleteReview 
} from './reviews.controller.js';
import { authenticate, customerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createReviewSchema, updateReviewSchema } from '../../shared/utils/validation.js';


const router = Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected customer routes
router.post('/', authenticate, customerOnly, validate(createReviewSchema), createReview);
router.patch('/:id', authenticate, customerOnly, validate(updateReviewSchema), updateReview); // ← CHANGED PUT to PATCH
router.delete('/:id', authenticate, customerOnly, deleteReview);

export default router;