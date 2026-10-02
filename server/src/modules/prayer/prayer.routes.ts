import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getTodayPrayers, completePrayer, uncompletePrayer } from './prayer.controller';

const router = Router();

router.use(authenticate);
router.get('/today', getTodayPrayers);
router.post('/:name/complete', completePrayer);
router.delete('/:name/complete', uncompletePrayer);

export default router;
