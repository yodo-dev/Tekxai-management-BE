import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  calculate_increment, create_increment, list_increments,
  approve_increment, reject_increment,
} from '../services/increment.service.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

// GET /api/v1/increment?user_id=&status=&review_year=&page=&limit=
router.get('/', ADMIN_HR, async (req, res, next) => {
  try {
    const result = await list_increments(req.query);
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

// GET /api/v1/increment/calculate/:userId?year=
router.get('/calculate/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const year = +req.query.year || new Date().getFullYear() - 1;
    const data = await calculate_increment(req.params.userId, year);
    return res.json({ success: true, payload: { ...data, review_year: year, user_id: req.params.userId } });
  } catch (err) { next(err); }
});

// GET /api/v1/increment/:userId/history
router.get('/:userId/history', ADMIN_HR, async (req, res, next) => {
  try {
    const result = await list_increments({ user_id: req.params.userId, ...req.query });
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

// POST /api/v1/increment/:userId
router.post('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const record = await create_increment(req.params.userId, req.body, req.user.id);
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// PUT /api/v1/increment/:userId/:id
router.put('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { status, notes, approved_by } = req.body;
    let result;
    if (status === 'APPROVED') {
      result = await approve_increment(req.params.id, req.user.id, notes);
    } else if (status === 'REJECTED') {
      result = await reject_increment(req.params.id, req.user.id, notes);
    } else {
      const prisma = (await import('../../../shared/database/client.js')).default;
      result = await prisma.salary_increments.update({
        where: { id: req.params.id },
        data: req.body,
      });
    }
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

// DELETE /api/v1/increment/:userId/:id
router.delete('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const prisma = (await import('../../../shared/database/client.js')).default;
    await prisma.salary_increments.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
