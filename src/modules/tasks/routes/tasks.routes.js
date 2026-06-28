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

/**
 * @swagger
 * /project/{projectId}/tasks:
 *   get:
 *     summary: List tasks for a project
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 */
router.get('/',     list_tasks);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:taskId', get_task);

/**
 * @swagger
 * /project/{projectId}/tasks:
 *   post:
 *     summary: Create a task in a project
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               assignee_id: { type: string }
 *               due_date: { type: string, format: date }
 *               priority: { type: string }
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',    MANAGER, create_task_ctrl);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               status: { type: string }
 *               progress: { type: integer }
 *     responses:
 *       200:
 *         description: Task updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:taskId',  update_task_ctrl);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:taskId', MANAGER, delete_task_ctrl);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/sub-tasks:
 *   get:
 *     summary: List sub-tasks of a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sub-tasks list
 *       401:
 *         description: Unauthorized
 */
router.get('/:taskId/sub-tasks', list_sub_tasks);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/sub-tasks:
 *   post:
 *     summary: Create a sub-task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *     responses:
 *       201:
 *         description: Sub-task created
 *       401:
 *         description: Unauthorized
 */
router.post('/:taskId/sub-tasks', create_sub_task);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/sub-tasks/{subId}:
 *   patch:
 *     summary: Toggle sub-task completion
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sub-task toggled
 *       401:
 *         description: Unauthorized
 */
router.patch('/:taskId/sub-tasks/:subId', toggle_sub_task);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/sub-tasks/{subId}:
 *   delete:
 *     summary: Delete a sub-task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sub-task deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:taskId/sub-tasks/:subId', delete_sub_task);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/time-logs:
 *   get:
 *     summary: List time logs for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Time logs list
 *       401:
 *         description: Unauthorized
 */
router.get('/:taskId/time-logs', list_time_logs);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/time-logs:
 *   post:
 *     summary: Log time on a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hours]
 *             properties:
 *               hours: { type: number }
 *               note: { type: string }
 *               date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Time logged
 *       401:
 *         description: Unauthorized
 */
router.post('/:taskId/time-logs', log_time);

/**
 * @swagger
 * /project/{projectId}/tasks/{taskId}/time-logs/{logId}:
 *   delete:
 *     summary: Delete a time log entry
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: logId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Time log deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:taskId/time-logs/:logId', delete_time_log);

export default router;
