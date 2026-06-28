import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_my_balances, get_user_balances_ctrl } from '../controllers/leave-balances.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /leave-balance/my:
 *   get:
 *     summary: Get current user's leave balances
 *     tags: [Leave]
 *     responses:
 *       200:
 *         description: Leave balances
 *       401:
 *         description: Unauthorized
 */
router.get('/my', get_my_balances);

/**
 * @swagger
 * /leave-balance/{userId}:
 *   get:
 *     summary: Get leave balances for a specific user
 *     tags: [Leave]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User leave balances
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), get_user_balances_ctrl);

export default router;
