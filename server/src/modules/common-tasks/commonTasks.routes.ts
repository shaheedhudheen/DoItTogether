import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getCommonTasks, createCommonTask, updateCommonTask, deleteCommonTask, completeCommonTask } from './commonTasks.controller';

const router = Router();

router.use(authenticate);
router.get('/', getCommonTasks);
router.post('/', createCommonTask);
router.patch('/:id', updateCommonTask);
router.delete('/:id', deleteCommonTask);
router.patch('/:id/complete', completeCommonTask);

export default router;
