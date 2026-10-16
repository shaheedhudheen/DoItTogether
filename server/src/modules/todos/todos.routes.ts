import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createTodoSchema, updateTodoSchema } from '@dit/shared';
import { getTodos, createTodo, updateTodo, deleteTodo, completeTodo, uncompleteTodo } from './todos.controller';

const router = Router();

router.use(authenticate);
router.get('/', getTodos);
router.post('/', validate(createTodoSchema), createTodo);
router.patch('/:id', validate(updateTodoSchema), updateTodo);
router.delete('/:id', deleteTodo);
router.post('/:id/complete', completeTodo);
router.delete('/:id/complete', uncompleteTodo);

export default router;
