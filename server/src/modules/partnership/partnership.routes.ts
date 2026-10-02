import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { generateInvite, joinPartnership, getPartnership, dissolvePartnership } from './partnership.controller';

const router = Router();

router.use(authenticate);
router.post('/invite', generateInvite);
router.post('/join', joinPartnership);
router.get('/', getPartnership);
router.delete('/', dissolvePartnership);

export default router;
