import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_user_balances, list_all_balances, initialize_balances } from '../services/leave_balance.service.js';

const router = Router();
router.use(authenticate);

const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /leave/balance:
 *   get:
 *     summary: Get current user's leave balance
 *     tags: [Leave]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Leave balance by policy
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', async (req, res, next) => {
  try {
    const { year } = req.query;
    return res.json({ success: true, payload: await get_user_balances(req.user.id, +year || undefined) });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /leave/balance/all:
 *   get:
 *     summary: Get leave balances for all employees
 *     tags: [Leave]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: All employee leave balances
 *       401:
 *         description: Unauthorized
 */
router.get('/balance/all', MANAGER, async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await list_all_balances(+req.query.year || undefined) });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /leave/balance/{userId}:
 *   get:
 *     summary: Get leave balance for a specific user
 *     tags: [Leave]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User leave balance
 *       401:
 *         description: Unauthorized
 */
router.get('/balance/:userId', MANAGER, async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await get_user_balances(req.params.userId, +req.query.year || undefined) });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /leave/balance/initialize:
 *   post:
 *     summary: Initialize leave balances for a user
 *     tags: [Leave]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *               year: { type: integer }
 *     responses:
 *       200:
 *         description: Balances initialized
 *       400:
 *         description: user_id required
 *       401:
 *         description: Unauthorized
 */
router.post('/balance/initialize', MANAGER, async (req, res, next) => {
  try {
    const { user_id, year } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    return res.json({ success: true, payload: await initialize_balances(user_id, +year || undefined) });
  } catch (e) { return next(e); }
});

export default router;
