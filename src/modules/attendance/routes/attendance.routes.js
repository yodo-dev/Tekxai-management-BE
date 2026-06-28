import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  assign_shift_ctrl, get_my_attendance_summary, get_my_shift_ctrl,
  list_shifts_ctrl, list_violations_ctrl, upsert_shift_ctrl,
} from '../controllers/attendance.controller.js';

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /attendance/shifts:
 *   get:
 *     summary: List all attendance shifts
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: List of shifts
 *       401:
 *         description: Unauthorized
 */
router.get('/shifts',          list_shifts_ctrl);

/**
 * @swagger
 * /attendance/shifts:
 *   post:
 *     summary: Create or update a shift
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, start_time, end_time]
 *             properties:
 *               name: { type: string }
 *               start_time: { type: string, example: '09:00' }
 *               end_time: { type: string, example: '18:00' }
 *               grace_period_mins: { type: integer }
 *     responses:
 *       200:
 *         description: Shift saved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/shifts',         MANAGER, upsert_shift_ctrl);

/**
 * @swagger
 * /attendance/shifts/assign:
 *   post:
 *     summary: Assign a shift to employees
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shift_id, user_ids]
 *             properties:
 *               shift_id: { type: string }
 *               user_ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Shift assigned
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/shifts/assign',  MANAGER, assign_shift_ctrl);

/**
 * @swagger
 * /attendance/my-shift:
 *   get:
 *     summary: Get current user's assigned shift
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Current shift
 *       401:
 *         description: Unauthorized
 */
router.get('/my-shift',        get_my_shift_ctrl);

/**
 * @swagger
 * /attendance/violations:
 *   get:
 *     summary: List attendance violations
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Violations list
 *       401:
 *         description: Unauthorized
 */
router.get('/violations',      list_violations_ctrl);

/**
 * @swagger
 * /attendance/my-summary:
 *   get:
 *     summary: Get current user's attendance summary
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Attendance summary
 *       401:
 *         description: Unauthorized
 */
router.get('/my-summary',      get_my_attendance_summary);

export default router;
