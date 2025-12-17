import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from './notifications.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/:id/read', authenticate, markAsRead); // ← CHANGED PUT to PATCH
router.patch('/read-all', authenticate, markAllAsRead); // ← CHANGED PUT to PATCH

export default router;