import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCommonTaskSchema, updateCommonTaskSchema } from '@dit/shared';
import { getCommonTasks, createCommonTask, updateCommonTask, deleteCommonTask, completeCommonTask } from './commonTasks.controller';

const router = Router();

router.use(authenticate);
router.get('/', getCommonTasks);
router.post('/', validate(createCommonTaskSchema), createCommonTask);
router.patch('/:id', validate(updateCommonTaskSchema), updateCommonTask);
router.delete('/:id', deleteCommonTask);
router.patch('/:id/complete', completeCommonTask);

export default router;
