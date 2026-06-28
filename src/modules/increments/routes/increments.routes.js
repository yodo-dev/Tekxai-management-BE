import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  calculate_increment, create_increment, list_increments,
  approve_increment, reject_increment,
} from '../services/increment.service.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /increment:
 *   get:
 *     summary: List salary increment records
 *     tags: [Increments]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: review_year
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Increment records
 *       401:
 *         description: Unauthorized
 */
router.get('/', ADMIN_HR, async (req, res, next) => {
  try {
    const result = await list_increments(req.query);
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /increment/calculate/{userId}:
 *   get:
 *     summary: Calculate suggested increment for a user
 *     tags: [Increments]
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
 *         description: Calculated increment suggestion
 *       401:
 *         description: Unauthorized
 */
router.get('/calculate/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const year = +req.query.year || new Date().getFullYear() - 1;
    const data = await calculate_increment(req.params.userId, year);
    return res.json({ success: true, payload: { ...data, review_year: year, user_id: req.params.userId } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /increment/{userId}/history:
 *   get:
 *     summary: Get increment history for a user
 *     tags: [Increments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Increment history
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId/history', ADMIN_HR, async (req, res, next) => {
  try {
    const result = await list_increments({ user_id: req.params.userId, ...req.query });
    return res.json({ success: true, payload: result });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /increment/{userId}:
 *   post:
 *     summary: Create salary increment for a user
 *     tags: [Increments]
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
 *             required: [new_salary, review_year]
 *             properties:
 *               new_salary: { type: number }
 *               review_year: { type: integer }
 *               percentage: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Increment created
 *       401:
 *         description: Unauthorized
 */
router.post('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const record = await create_increment(req.params.userId, req.body, req.user.id);
    return res.status(201).json({ success: true, payload: record });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /increment/{userId}/{id}:
 *   put:
 *     summary: Update increment (or approve/reject by setting status)
 *     tags: [Increments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
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
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Increment updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
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

/**
 * @swagger
 * /increment/{userId}/{id}:
 *   delete:
 *     summary: Delete an increment record
 *     tags: [Increments]
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
 *         description: Increment deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const prisma = (await import('../../../shared/database/client.js')).default;
    await prisma.salary_increments.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
