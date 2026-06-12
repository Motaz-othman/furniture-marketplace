import { Router } from 'express';
import { subscribe } from './newsletter.controller.js';
import { createLimiter } from '../../shared/middleware/rateLimiter.js';

const router = Router();

router.post('/subscribe', createLimiter, subscribe);

export default router;
