import { Router } from 'express';
import { getStatus, getLogs, triggerSync, triggerProductSync, getSchedule, patchSchedule } from './sync.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/status', getStatus);
router.get('/logs', getLogs);
router.post('/trigger', triggerSync);
router.post('/trigger/product/:externalId', triggerProductSync);
router.get('/schedule', getSchedule);
router.patch('/schedule', patchSchedule);

export default router;
