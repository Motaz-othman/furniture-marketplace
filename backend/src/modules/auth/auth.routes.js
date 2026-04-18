import { Router } from 'express';
import { register, login, updateProfile, changePassword, deleteAccount, getMe, forgotPassword, resetPassword } from './auth.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { authLimiter } from '../../shared/middleware/rateLimiter.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../../shared/utils/validation.js';

const router = Router();

// Public routes (rate-limited)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Protected routes
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.delete('/account', authenticate, deleteAccount);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, getMe);
export default router;