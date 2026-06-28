import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_task_ctrl, delete_task_ctrl, get_task,
  list_tasks, update_task_ctrl,
} from '../controllers/tasks.controller.js';
import { list_sub_tasks, create_sub_task, toggle_sub_task, delete_sub_task } from '../controllers/sub_tasks.controller.js';
import { list_time_logs, log_time, delete_time_log } from '../controllers/time_logs.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/',     list_tasks);
router.get('/:taskId', get_task);
router.post('/',    MANAGER, create_task_ctrl);
router.put('/:taskId',  update_task_ctrl); // any auth can update own assignment
router.delete('/:taskId', MANAGER, delete_task_ctrl);

// sub-tasks
router.get('/:taskId/sub-tasks', list_sub_tasks);
router.post('/:taskId/sub-tasks', create_sub_task);
router.patch('/:taskId/sub-tasks/:subId', toggle_sub_task);
router.delete('/:taskId/sub-tasks/:subId', delete_sub_task);

// time logs
router.get('/:taskId/time-logs', list_time_logs);
router.post('/:taskId/time-logs', log_time);
router.delete('/:taskId/time-logs/:logId', delete_time_log);

export default router;
