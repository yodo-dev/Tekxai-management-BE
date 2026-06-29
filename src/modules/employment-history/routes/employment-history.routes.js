import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /employment-history/{userId}:
 *   get:
 *     summary: Get employment history for a user
 *     tags: [Employment History]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employment history list
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const records = await prisma.employment_history.findMany({
      take: 500,
      where: { user_id: req.params.userId },
      orderBy: [{ is_current: 'desc' }, { from_date: 'desc' }],
    });
    return res.json({ success: true, payload: { records, total: records.length } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /employment-history/{userId}:
 *   post:
 *     summary: Add employment history record
 *     tags: [Employment History]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name, designation]
 *             properties:
 *               company_name: { type: string }
 *               designation: { type: string }
 *               from_date: { type: string, format: date }
 *               to_date: { type: string, format: date }
 *               is_current: { type: boolean }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Record created
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /employment-history/{userId}/{id}:
 *   put:
 *     summary: Update an employment history record
 *     tags: [Employment History]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record updated
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /employment-history/{userId}/{id}:
 *   delete:
 *     summary: Delete an employment history record
 *     tags: [Employment History]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    await prisma.employment_history.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
