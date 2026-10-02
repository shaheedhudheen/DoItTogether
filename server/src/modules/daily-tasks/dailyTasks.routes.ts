import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getDailyTasks, createDailyTask, updateDailyTask, deleteDailyTask, completeDailyTask, uncompleteDailyTask } from './dailyTasks.controller';

const router = Router();

router.use(authenticate);
router.get('/', getDailyTasks);
router.post('/', createDailyTask);
router.patch('/:id', updateDailyTask);
router.delete('/:id', deleteDailyTask);
router.post('/:id/complete', completeDailyTask);
router.delete('/:id/complete', uncompleteDailyTask);

export default router;
