import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

// GET /api/v1/education-record/:userId
router.get('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const records = await prisma.education_records.findMany({
      where: { user_id: req.params.userId },
      orderBy: { passing_year: 'desc' },
    });
    return res.json({ success: true, payload: { records, total: records.length } });
  } catch (err) { next(err); }
});

// POST /api/v1/education-record/:userId
router.post('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const { qualification, field_of_study, institute, passing_year, cgpa, cgpa_out_of, division_class, percentage } = req.body;
    const record = await prisma.education_records.create({
      data: {
        user_id: req.params.userId,
        qualification: qualification || 'OTHER',
        field_of_study, institute,
        passing_year: passing_year ? +passing_year : null,
        cgpa: cgpa ? +cgpa : null,
        cgpa_out_of: cgpa_out_of ? +cgpa_out_of : null,
        division_class,
        percentage: percentage ? +percentage : null,
      },
    });
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// PUT /api/v1/education-record/:userId/:id
router.put('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { qualification, field_of_study, institute, passing_year, cgpa, cgpa_out_of, division_class, percentage } = req.body;
    const record = await prisma.education_records.update({
      where: { id: req.params.id },
      data: {
        qualification, field_of_study, institute,
        passing_year: passing_year ? +passing_year : null,
        cgpa: cgpa ? +cgpa : null,
        cgpa_out_of: cgpa_out_of ? +cgpa_out_of : null,
        division_class,
        percentage: percentage ? +percentage : null,
      },
    });
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// DELETE /api/v1/education-record/:userId/:id
router.delete('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    await prisma.education_records.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
