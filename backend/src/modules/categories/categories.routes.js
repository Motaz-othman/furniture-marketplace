import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from './categories.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createCategorySchema } from '../../shared/utils/validation.js';

const router = Router();

// Public routes (anyone can view)
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected routes (admin only + validation)
router.post('/', authenticate, adminOnly, validate(createCategorySchema), createCategory);
router.put('/:id', authenticate, adminOnly, validate(createCategorySchema), updateCategory);
router.delete('/:id', authenticate, adminOnly, deleteCategory);

export default router;