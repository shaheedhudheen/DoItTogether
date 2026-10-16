import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { rateLimit } from '../../middleware/rateLimit';
import { joinPartnershipSchema } from '@dit/shared';
import { generateInvite, joinPartnership, getPartnership, dissolvePartnership } from './partnership.controller';

const router = Router();

// Invite codes are short — cap join attempts per authenticated user so a
// single account cannot brute-force another couple's pending code.
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Runs after `authenticate` (registered below), so req.user is populated.
  key: (req) => `join:${req.ip}:${(req as AuthRequest).user?.id || 'anon'}`
});

router.use(authenticate);
router.post('/invite', generateInvite);
router.post('/join', joinLimiter, validate(joinPartnershipSchema), joinPartnership);
router.get('/', getPartnership);
router.delete('/', dissolvePartnership);

export default router;
