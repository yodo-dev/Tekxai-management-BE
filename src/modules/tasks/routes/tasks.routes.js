import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_task_ctrl, delete_task_ctrl, get_task,
  list_tasks, update_task_ctrl,
} from '../controllers/tasks.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/',     list_tasks);
router.get('/:taskId', get_task);
router.post('/',    MANAGER, create_task_ctrl);
router.put('/:taskId',  update_task_ctrl); // any auth can update own assignment
router.delete('/:taskId', MANAGER, delete_task_ctrl);

export default router;
