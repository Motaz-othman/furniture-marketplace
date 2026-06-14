import { Router } from 'express';
import { search, getKeywords } from './search.controller.js';

const router = Router();

// Public search routes (no authentication required)
router.get('/keywords', getKeywords);
router.get('/', search);

export default router;