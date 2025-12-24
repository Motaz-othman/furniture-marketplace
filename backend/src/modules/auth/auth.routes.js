import { Router } from 'express';
import { register, login, updateProfile, changePassword, deleteAccount,getMe } from './auth.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../../shared/utils/validation.js';
// Add imports at top
import { forgotPassword, resetPassword } from './auth.controller.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../../shared/utils/validation.js';



const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.delete('/account', authenticate, deleteAccount);
// Add these routes (public - no authentication needed)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, getMe);
export default router;