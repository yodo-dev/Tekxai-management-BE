import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { complete_task, create_task, get_tasks } from '../controllers/offboarding.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /offboarding/tasks/{userId}:
 *   get:
 *     summary: Get offboarding tasks for a user
 *     tags: [Offboarding]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tasks list
 *       401:
 *         description: Unauthorized
 */
router.get('/tasks/:userId',      HR,   get_tasks);

/**
 * @swagger
 * /offboarding/tasks:
 *   post:
 *     summary: Create an offboarding task
 *     tags: [Offboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, title]
 *             properties:
 *               user_id: { type: string }
 *               title: { type: string }
 *               due_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Task created
 *       401:
 *         description: Unauthorized
 */
router.post('/tasks',             HR, create_task);

/**
 * @swagger
 * /offboarding/tasks/{id}/complete:
 *   patch:
 *     summary: Mark offboarding task as complete
 *     tags: [Offboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task completed
 *       401:
 *         description: Unauthorized
 */
router.patch('/tasks/:id/complete', HR, complete_task);

export default router;
