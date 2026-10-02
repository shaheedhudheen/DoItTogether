import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getTodos, createTodo, updateTodo, deleteTodo, completeTodo, uncompleteTodo } from './todos.controller';

const router = Router();

router.use(authenticate);
router.get('/', getTodos);
router.post('/', createTodo);
router.patch('/:id', updateTodo);
router.delete('/:id', deleteTodo);
router.post('/:id/complete', completeTodo);
router.delete('/:id/complete', uncompleteTodo);

export default router;
