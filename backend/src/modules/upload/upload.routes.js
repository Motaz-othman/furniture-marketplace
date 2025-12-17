import { Router } from 'express';
import multer from 'multer';
import { uploadImage, uploadMultipleImages } from './upload.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload routes (require authentication)
router.post('/image', authenticate, upload.single('image'), uploadImage);
router.post('/images', authenticate, upload.array('images', 10), uploadMultipleImages);

export default router;