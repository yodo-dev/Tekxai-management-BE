import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  submit_overtime, approve_overtime, reject_overtime, cancel_overtime,
  list_overtime, get_overtime_stats, get_payroll_data,
} from '../services/overtime.service.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');
const MANAGER  = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

function is_admin(req) {
  return req.user.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(r));
}

// POST /api/v1/overtime — employee submits
router.post('/', async (req, res, next) => {
  try {
    const record = await submit_overtime(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// GET /api/v1/overtime — list (admin sees all, employee sees own)
router.get('/', async (req, res, next) => {
  try {
    const admin = is_admin(req);
    const result = await list_overtime({
      ...req.query,
      is_admin: admin,
      current_user_id: req.user.id,
    });
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

// GET /api/v1/overtime/stats — aggregate stats
router.get('/stats', MANAGER, async (req, res, next) => {
  try {
    const stats = await get_overtime_stats(req.query);
    return res.json({ success: true, payload: stats });
  } catch (err) { next(err); }
});

// GET /api/v1/overtime/payroll — payroll-ready data for a user+month
router.get('/payroll', ADMIN_HR, async (req, res, next) => {
  try {
    const { user_id, month, year } = req.query;
    if (!user_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'user_id, month, year required' });
    }
    const data = await get_payroll_data({ user_id, month: +month, year: +year });
    return res.json({ success: true, payload: data });
  } catch (err) { next(err); }
});

// GET /api/v1/overtime/:id — single record
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = (await import('../../../shared/database/client.js')).default;
    const record = await prisma.overtime_requests.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { first_name: true, last_name: true, email: true, employee_id: true } },
        approver: { select: { first_name: true, last_name: true } },
      },
    });
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    if (!is_admin(req) && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// POST /api/v1/overtime/:id/approve
router.post('/:id/approve', MANAGER, async (req, res, next) => {
  try {
    const record = await approve_overtime(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// POST /api/v1/overtime/:id/reject
router.post('/:id/reject', MANAGER, async (req, res, next) => {
  try {
    const record = await reject_overtime(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// POST /api/v1/overtime/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const record = await cancel_overtime(req.params.id, req.user.id, is_admin(req));
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

export default router;
