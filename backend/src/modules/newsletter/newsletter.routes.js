import { Router } from 'express';
import { subscribe } from './newsletter.controller.js';

const router = Router();

router.post('/subscribe', subscribe);

export default router;
