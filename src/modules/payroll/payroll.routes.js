import { Router } from 'express';
import { authenticate, can_or_role } from '../../shared/middleware/authenticate.js';
import { list_runs, create_run, calculate_run, get_run, update_run_status, get_payslip } from './payroll.controller.js';

const router = Router();
router.use(authenticate);

const HR_ADMIN = can_or_role('erp.users.view', 'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /payroll:
 *   get:
 *     summary: List payroll runs
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: Payroll runs list
 *       401:
 *         description: Unauthorized
 */
router.get('/',                              HR_ADMIN, list_runs);

/**
 * @swagger
 * /payroll:
 *   post:
 *     summary: Create a payroll run
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [period]
 *             properties:
 *               period: { type: string, example: '2026-06' }
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Payroll run created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',                             HR_ADMIN, create_run);

/**
 * @swagger
 * /payroll/{id}:
 *   get:
 *     summary: Get a payroll run by ID
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payroll run details
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',                           HR_ADMIN, get_run);

/**
 * @swagger
 * /payroll/{id}/calculate:
 *   post:
 *     summary: Calculate payroll for a run
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payroll calculated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Run not found
 *       409:
 *         description: Run is COMPLETED or PAID — completed/paid runs are immutable and cannot be recalculated
 */
router.post('/:id/calculate',               HR_ADMIN, calculate_run);

/**
 * @swagger
 * /payroll/{id}/status:
 *   patch:
 *     summary: Advance a payroll run's status (forward-only, single step — DRAFT -> PROCESSING -> COMPLETED -> PAID)
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [DRAFT, PROCESSING, COMPLETED, PAID] }
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: status is not one of DRAFT, PROCESSING, COMPLETED, PAID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Run not found
 *       409:
 *         description: Invalid transition — only a single forward step is allowed (no skipping, no reverse, no change once PAID)
 */
router.patch('/:id/status',                 HR_ADMIN, update_run_status);

/**
 * @swagger
 * /payroll/{id}/entries/{entryId}/payslip:
 *   get:
 *     summary: Get payslip for a payroll entry
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payslip data
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/entries/:entryId/payslip', get_payslip);

export default router;
