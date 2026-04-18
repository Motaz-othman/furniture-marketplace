import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { guestCheckoutSchema } from '../../shared/utils/validation.js';
import { guestCheckout, trackGuestOrder } from './guest.controller.js';

const router = Router();

router.post('/guest', optionalAuth, validate(guestCheckoutSchema), guestCheckout);
router.get('/track/:orderNumber', trackGuestOrder);

export default router;
