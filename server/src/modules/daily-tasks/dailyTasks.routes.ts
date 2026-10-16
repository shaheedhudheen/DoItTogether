import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDailyTaskSchema, updateDailyTaskSchema } from '@dit/shared';
import { getDailyTasks, createDailyTask, updateDailyTask, deleteDailyTask, completeDailyTask, uncompleteDailyTask } from './dailyTasks.controller';

const router = Router();

router.use(authenticate);
router.get('/', getDailyTasks);
router.post('/', validate(createDailyTaskSchema), createDailyTask);
router.patch('/:id', validate(updateDailyTaskSchema), updateDailyTask);
router.delete('/:id', deleteDailyTask);
router.post('/:id/complete', completeDailyTask);
router.delete('/:id/complete', uncompleteDailyTask);

export default router;
