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

/**
 * @swagger
 * /overtime:
 *   post:
 *     summary: Submit an overtime request
 *     tags: [Overtime]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, hours]
 *             properties:
 *               date: { type: string, format: date }
 *               hours: { type: number }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Overtime request submitted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req, res, next) => {
  try {
    const record = await submit_overtime(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /overtime:
 *   get:
 *     summary: List overtime requests (admin sees all, employee sees own)
 *     tags: [Overtime]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Overtime requests list
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /overtime/stats:
 *   get:
 *     summary: Get overtime aggregate stats
 *     tags: [Overtime]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Overtime stats
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', MANAGER, async (req, res, next) => {
  try {
    const stats = await get_overtime_stats(req.query);
    return res.json({ success: true, payload: stats });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /overtime/payroll:
 *   get:
 *     summary: Get payroll-ready overtime data for a user and month
 *     tags: [Overtime]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payroll data
 *       400:
 *         description: Missing required query params
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /overtime/{id}:
 *   get:
 *     summary: Get a single overtime request
 *     tags: [Overtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Overtime record
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /overtime/{id}/approve:
 *   post:
 *     summary: Approve an overtime request
 *     tags: [Overtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Overtime approved
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/approve', MANAGER, async (req, res, next) => {
  try {
    const record = await approve_overtime(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /overtime/{id}/reject:
 *   post:
 *     summary: Reject an overtime request
 *     tags: [Overtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Overtime rejected
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/reject', MANAGER, async (req, res, next) => {
  try {
    const record = await reject_overtime(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /overtime/{id}/cancel:
 *   post:
 *     summary: Cancel an overtime request
 *     tags: [Overtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Overtime cancelled
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const record = await cancel_overtime(req.params.id, req.user.id, is_admin(req));
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

export default router;
