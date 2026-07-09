import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { get_designations_ctrl, get_full_record_ctrl, get_profile_ctrl, upsert_profile_ctrl } from '../controllers/hr-profile.controller.js';

const router = Router();
router.use(authenticate);

const VIEW = can_or_role('hr.employee_profiles.view', 'SUPER_ADMIN', 'ADMIN', 'HR');
const EDIT = can_or_role('hr.employee_profiles.edit', 'SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /hr-profile/designations:
 *   get:
 *     summary: List all designations
 *     tags: [HR Profile]
 *     responses:
 *       200:
 *         description: Designations list
 *       401:
 *         description: Unauthorized
 */
router.get('/designations',   get_designations_ctrl);

/**
 * @swagger
 * /hr-profile/{userId}:
 *   get:
 *     summary: Get HR profile for a user
 *     tags: [HR Profile]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: HR profile
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId',        VIEW, get_profile_ctrl);

/**
 * @swagger
 * /hr-profile/{userId}:
 *   put:
 *     summary: Create or update HR profile for a user
 *     tags: [HR Profile]
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
 *             properties:
 *               employment_status: { type: string }
 *               employment_type: { type: string }
 *               grade: { type: string }
 *               base_salary: { type: number }
 *               probation_end_date: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Profile saved
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId',        EDIT, upsert_profile_ctrl);

/**
 * @swagger
 * /hr-profile/{userId}/full:
 *   get:
 *     summary: Get full HR record including profile, documents, education, employment history
 *     tags: [HR Profile]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full HR record
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId/full',   VIEW, get_full_record_ctrl);

export default router;
