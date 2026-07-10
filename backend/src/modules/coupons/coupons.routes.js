import { Router } from 'express';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from './coupons.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/',           listCoupons);
router.post('/',          createCoupon);
router.patch('/:id',      updateCoupon);
router.delete('/:id',     deleteCoupon);
router.post('/validate',  validateCoupon);

export default router;
