import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getCalendarDate, getCalendarRange } from './calendar.controller';

const router = Router();

router.use(authenticate);
router.get('/range', getCalendarRange);
router.get('/:date', getCalendarDate);

export default router;
