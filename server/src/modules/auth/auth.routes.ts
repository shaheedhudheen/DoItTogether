import { Router } from 'express';
import { register, login, refresh, logout, getMe, updateProfile } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { rateLimit } from '../../middleware/rateLimit';
import { registerSchema, loginSchema, updateProfileSchema } from '@dit/shared';

const router = Router();

// Throttle credential endpoints (per IP + email for login, per IP for register)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `login:${req.ip}:${String(req.body?.email || '').toLowerCase()}`
});
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
