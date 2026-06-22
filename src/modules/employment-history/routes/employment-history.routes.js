import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

// GET /api/v1/employment-history/:userId
router.get('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const records = await prisma.employment_history.findMany({
      where: { user_id: req.params.userId },
      orderBy: [{ is_current: 'desc' }, { from_date: 'desc' }],
    });
    return res.json({ success: true, payload: { records, total: records.length } });
  } catch (err) { next(err); }
});

// POST /api/v1/employment-history/:userId
router.post('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const { company_name, designation, from_date, to_date, is_current, notes } = req.body;
    const record = await prisma.employment_history.create({
      data: {
        user_id: req.params.userId,
        company_name,
        designation,
        from_date: from_date ? new Date(from_date) : null,
        to_date: to_date ? new Date(to_date) : null,
        is_current: !!is_current,
        notes,
      },
    });
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// PUT /api/v1/employment-history/:userId/:id
router.put('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { company_name, designation, from_date, to_date, is_current, notes } = req.body;
    const record = await prisma.employment_history.update({
      where: { id: req.params.id },
      data: {
        company_name, designation,
        from_date: from_date ? new Date(from_date) : null,
        to_date: to_date ? new Date(to_date) : null,
        is_current: !!is_current,
        notes,
      },
    });
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// DELETE /api/v1/employment-history/:userId/:id
router.delete('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    await prisma.employment_history.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
