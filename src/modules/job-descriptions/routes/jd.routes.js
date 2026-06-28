import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_my_jd, get_user_jd, upsert_jd_ctrl } from '../controllers/jd.controller.js';

const router = Router();
router.use(authenticate);
const M = authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER');

/**
 * @swagger
 * /job-description/my:
 *   get:
 *     summary: Get current user's job description
 *     tags: [Job Descriptions]
 *     responses:
 *       200:
 *         description: My job description
 *       401:
 *         description: Unauthorized
 */
router.get('/my', get_my_jd);

/**
 * @swagger
 * /job-description/my:
 *   put:
 *     summary: Update current user's job description
 *     tags: [Job Descriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               responsibilities: { type: string }
 *               qualifications: { type: string }
 *               kpi_targets:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: JD updated
 *       401:
 *         description: Unauthorized
 */
router.put('/my', upsert_jd_ctrl);

/**
 * @swagger
 * /job-description/{userId}:
 *   get:
 *     summary: Get job description for a specific user
 *     tags: [Job Descriptions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Job description
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', M, get_user_jd);

/**
 * @swagger
 * /job-description/{userId}:
 *   put:
 *     summary: Update job description for a specific user
 *     tags: [Job Descriptions]
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
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               responsibilities: { type: string }
 *               qualifications: { type: string }
 *     responses:
 *       200:
 *         description: JD updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId', M, upsert_jd_ctrl);

export default router;
