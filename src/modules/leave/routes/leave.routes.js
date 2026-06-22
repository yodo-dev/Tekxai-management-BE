import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_user_balances, list_all_balances, initialize_balances } from '../services/leave_balance.service.js';

const router = Router();
router.use(authenticate);

const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

// GET /leave/balance — own balance
router.get('/balance', async (req, res, next) => {
  try {
    const { year } = req.query;
    return res.json({ success: true, payload: await get_user_balances(req.user.id, +year || undefined) });
  } catch (e) { return next(e); }
});

// GET /leave/balance/all — all employees (admin/HR)
router.get('/balance/all', MANAGER, async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await list_all_balances(+req.query.year || undefined) });
  } catch (e) { return next(e); }
});

// GET /leave/balance/:userId — specific user (admin/HR)
router.get('/balance/:userId', MANAGER, async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await get_user_balances(req.params.userId, +req.query.year || undefined) });
  } catch (e) { return next(e); }
});

// POST /leave/balance/initialize — initialize balances for a user
router.post('/balance/initialize', MANAGER, async (req, res, next) => {
  try {
    const { user_id, year } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    return res.json({ success: true, payload: await initialize_balances(user_id, +year || undefined) });
  } catch (e) { return next(e); }
});

export default router;
