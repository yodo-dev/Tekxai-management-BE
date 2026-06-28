import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /education-record/{userId}:
 *   get:
 *     summary: Get education records for a user
 *     tags: [Education]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Education records list
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const records = await prisma.education_records.findMany({
      where: { user_id: req.params.userId },
      orderBy: { passing_year: 'desc' },
    });
    return res.json({ success: true, payload: { records, total: records.length } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /education-record/{userId}:
 *   post:
 *     summary: Add education record for a user
 *     tags: [Education]
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
 *             required: [qualification]
 *             properties:
 *               qualification: { type: string }
 *               field_of_study: { type: string }
 *               institute: { type: string }
 *               passing_year: { type: integer }
 *               cgpa: { type: number }
 *               cgpa_out_of: { type: number }
 *               division_class: { type: string }
 *               percentage: { type: number }
 *     responses:
 *       201:
 *         description: Record created
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /education-record/{userId}/{id}:
 *   put:
 *     summary: Update an education record
 *     tags: [Education]
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

/**
 * @swagger
 * /education-record/{userId}/{id}:
 *   delete:
 *     summary: Delete an education record
 *     tags: [Education]
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
    await prisma.education_records.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
