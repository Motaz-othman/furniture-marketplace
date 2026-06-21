import { Router } from 'express';
import multer from 'multer';
import { getStatus, getLogs, importAcme, refreshAcme, importGlobalFurniture, clearGlobalFurnitureProducts, importUnitedWeavers, triggerGfwDropboxSync } from './vendor-import.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const ALLOWED_MIMETYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // some browsers send this for xlsx
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext) || ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`Unsupported file type: ${file.originalname}. Upload a .csv or .xlsx file.`));
  },
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

router.delete('/gfw/products', clearGlobalFurnitureProducts);
router.post('/gfw/dropbox-sync', triggerGfwDropboxSync);

router.post('/gfw/import', upload.fields([
  { name: 'dataCsv', maxCount: 1 },
  { name: 'inventoryCsv', maxCount: 1 },
]), importGlobalFurniture);

router.post('/uw/import', upload.fields([
  { name: 'catalogCsv', maxCount: 1 },
  { name: 'inventoryCsv', maxCount: 1 },
]), importUnitedWeavers);

export default router;
