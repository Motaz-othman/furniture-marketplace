import { Router } from 'express';
import multer from 'multer';
import { uploadImage, uploadMultipleImages } from './upload.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (videos allowed)
  }
});

// Upload routes — admin only to prevent Cloudinary quota abuse
router.post('/image', authenticate, adminOnly, upload.single('image'), uploadImage);
router.post('/images', authenticate, adminOnly, upload.array('images', 10), uploadMultipleImages);

export default router;
