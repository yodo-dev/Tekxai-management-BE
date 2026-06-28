import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  approve_bonus_ctrl,
  calc_bonus,
  get_bonus,
  get_reports,
  get_score_for_employee,
  get_scores,
  patch_report,
  pay_bonus_ctrl,
  post_report,
  post_score,
} from '../controllers/performance.controller.js';

const router = Router();
router.use(authenticate);
const MANAGER = can_or_role('erp.performance.view',    'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const APPROVE = can_or_role('erp.performance.approve', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /performance/daily-report:
 *   get:
 *     summary: List daily performance reports
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Daily reports list
 *       401:
 *         description: Unauthorized
 */
router.get('/daily-report', get_reports);

/**
 * @swagger
 * /performance/daily-report:
 *   post:
 *     summary: Submit a daily performance report
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               report_date: { type: string, format: date }
 *               tasks_completed: { type: string }
 *               challenges: { type: string }
 *               plan_for_tomorrow: { type: string }
 *     responses:
 *       201:
 *         description: Report submitted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/daily-report', post_report);

/**
 * @swagger
 * /performance/daily-report/{id}:
 *   put:
 *     summary: Update a daily report
 *     tags: [Performance]
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
 *               tasks_completed: { type: string }
 *               challenges: { type: string }
 *     responses:
 *       200:
 *         description: Report updated
 *       401:
 *         description: Unauthorized
 */
router.put('/daily-report/:id', patch_report);

/**
 * @swagger
 * /performance/score:
 *   get:
 *     summary: List performance scores
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Scores list
 *       401:
 *         description: Unauthorized
 */
router.get('/score', get_scores);

/**
 * @swagger
 * /performance/score/{employeeId}:
 *   get:
 *     summary: Get performance score for a specific employee
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee score
 *       401:
 *         description: Unauthorized
 */
router.get('/score/:employeeId', MANAGER, get_score_for_employee);

/**
 * @swagger
 * /performance/score:
 *   post:
 *     summary: Submit performance score for an employee
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, period]
 *             properties:
 *               user_id: { type: string }
 *               period: { type: string }
 *               timely_delivery: { type: number }
 *               quality_score: { type: number }
 *               regularity: { type: number }
 *               punctuality: { type: number }
 *               dress_code: { type: number }
 *     responses:
 *       201:
 *         description: Score submitted
 *       401:
 *         description: Unauthorized
 */
router.post('/score', MANAGER, post_score);

/**
 * @swagger
 * /performance/bonus:
 *   get:
 *     summary: List bonus records
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bonus records
 *       401:
 *         description: Unauthorized
 */
router.get('/bonus', get_bonus);

/**
 * @swagger
 * /performance/bonus/calculate:
 *   post:
 *     summary: Calculate bonuses for a period
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [period]
 *             properties:
 *               period: { type: string }
 *     responses:
 *       200:
 *         description: Bonus calculated
 *       401:
 *         description: Unauthorized
 */
router.post('/bonus/calculate', MANAGER, calc_bonus);

/**
 * @swagger
 * /performance/bonus/{id}/approve:
 *   post:
 *     summary: Approve a bonus record
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bonus approved
 *       401:
 *         description: Unauthorized
 */
router.post('/bonus/:id/approve', APPROVE, approve_bonus_ctrl);

/**
 * @swagger
 * /performance/bonus/{id}/pay:
 *   post:
 *     summary: Mark bonus as paid
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bonus marked paid
 *       401:
 *         description: Unauthorized
 */
router.post('/bonus/:id/pay', can_or_role('erp.performance.approve', 'ADMIN', 'SUPER_ADMIN'), pay_bonus_ctrl);

export default router;
