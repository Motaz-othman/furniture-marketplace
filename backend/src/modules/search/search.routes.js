import { Router } from 'express';
import { search } from './search.controller.js';

const router = Router();

// Public search route (no authentication required)
router.get('/', search);

export default router;