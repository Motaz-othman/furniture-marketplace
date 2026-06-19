import { Router } from 'express';
import multer from 'multer';
import { getStatus, getLogs, importAcme, refreshAcme, importGlobalFurniture, importUnitedWeavers } from './vendor-import.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// CSV uploads only need memory, not the 100MB image limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

router.use(authenticate, adminOnly);

router.get('/status', getStatus);
router.get('/logs', getLogs);

router.post('/acme/import', upload.fields([
  { name: 'specCsv', maxCount: 1 },
  { name: 'imagesCsv', maxCount: 1 },
  { name: 'priceCsv', maxCount: 1 },
  { name: 'inventoryCsv', maxCount: 1 },
]), importAcme);

router.post('/acme/refresh', upload.fields([
  { name: 'priceCsv', maxCount: 1 },
  { name: 'inventoryCsv', maxCount: 1 },
]), refreshAcme);

router.post('/gfw/import', upload.single('csv'), importGlobalFurniture);

router.post('/uw/import', upload.fields([
  { name: 'catalogCsv', maxCount: 1 },
  { name: 'inventoryCsv', maxCount: 1 },
]), importUnitedWeavers);

export default router;
