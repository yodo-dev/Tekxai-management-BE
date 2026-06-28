import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { list_activity_ctrl, list_my_activity_ctrl } from '../controllers/activity.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /activity-logs:
 *   get:
 *     summary: List all activity logs (admin)
 *     tags: [Activity Logs]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Activity logs
 *       401:
 *         description: Unauthorized
 */
router.get('/', list_activity_ctrl);

/**
 * @swagger
 * /activity-logs/my:
 *   get:
 *     summary: List current user's activity logs
 *     tags: [Activity Logs]
 *     responses:
 *       200:
 *         description: My activity logs
 *       401:
 *         description: Unauthorized
 */
router.get('/my', list_my_activity_ctrl);

export default router;
