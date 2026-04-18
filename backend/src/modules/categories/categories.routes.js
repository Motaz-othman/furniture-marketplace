import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getCategoryHierarchy,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createCategorySchema } from '../../shared/utils/validation.js';

const router = Router();

// Public routes
router.get('/', getAllCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:parentId/subcategories', getSubcategories);
router.get('/:categoryId/hierarchy', getCategoryHierarchy);
router.get('/:id', getCategoryById);

// Protected routes (admin only)
router.post('/', authenticate, adminOnly, validate(createCategorySchema), createCategory);
router.put('/:id', authenticate, adminOnly, validate(createCategorySchema), updateCategory);
router.delete('/:id', authenticate, adminOnly, deleteCategory);

export default router;
