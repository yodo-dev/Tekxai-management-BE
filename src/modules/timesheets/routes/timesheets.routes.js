import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  approve_edit,
  approve_time_off_ctrl,
  clock_in,
  clock_out,
  create_entry_ctrl,
  delete_entry_ctrl,
  force_checkout,
  get_time_off_policies,
  list_time_off_ctrl,
  my_requests,
  reject_edit,
  reject_time_off_ctrl,
  recent_activity,
  request_entry_edit,
  requests,
  time_off_request,
  today_entry,
  update_entry_ctrl,
  weekly,
} from '../controllers/timesheets.controller.js';

const router = Router();
router.use(authenticate);

const MANAGER = can_or_role('erp.timesheet.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const APPROVE = can_or_role('erp.timesheet.approve', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /timesheet/clock-in:
 *   post:
 *     summary: Clock in to start work session
 *     tags: [Timesheets]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_wfh: { type: boolean }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Clocked in successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/clock-in',                       clock_in);

/**
 * @swagger
 * /timesheet/clock-out:
 *   post:
 *     summary: Clock out to end work session
 *     tags: [Timesheets]
 *     responses:
 *       200:
 *         description: Clocked out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/clock-out',                      clock_out);

/**
 * @swagger
 * /timesheet/force-checkout:
 *   post:
 *     summary: Force close open timesheet entry
 *     tags: [Timesheets]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, enum: [LOGOUT, IDLE_TIMEOUT, MANUAL] }
 *     responses:
 *       200:
 *         description: Entry closed
 *       401:
 *         description: Unauthorized
 */
router.post('/force-checkout',                 force_checkout);

/**
 * @swagger
 * /timesheet/today:
 *   get:
 *     summary: Get today's timesheet entry
 *     tags: [Timesheets]
 *     responses:
 *       200:
 *         description: Today's entry
 *       401:
 *         description: Unauthorized
 */
router.get('/today',                           today_entry);

/**
 * @swagger
 * /timesheet/weekly:
 *   get:
 *     summary: Get weekly timesheet summary
 *     tags: [Timesheets]
 *     parameters:
 *       - in: query
 *         name: week_start
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Weekly summary
 *       401:
 *         description: Unauthorized
 */
router.get('/weekly',                          weekly);

/**
 * @swagger
 * /timesheet/recent-activity:
 *   get:
 *     summary: Recent check-in/check-out activity feed (admin sees all employees)
 *     tags: [Timesheets]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Recent activity events
 *       401:
 *         description: Unauthorized
 */
router.get('/recent-activity',                 recent_activity);

/**
 * @swagger
 * /timesheet/requests:
 *   get:
 *     summary: List timesheet edit requests (admin sees all)
 *     tags: [Timesheets]
 *     responses:
 *       200:
 *         description: Edit requests
 *       401:
 *         description: Unauthorized
 */
router.get('/requests',                        requests);

/**
 * @swagger
 * /timesheet/my-requests:
 *   get:
 *     summary: List current user's edit requests
 *     tags: [Timesheets]
 *     responses:
 *       200:
 *         description: My edit requests
 *       401:
 *         description: Unauthorized
 */
router.get('/my-requests',                     my_requests);

/**
 * @swagger
 * /timesheet/time-off/policies:
 *   get:
 *     summary: List time-off policies
 *     tags: [Timesheets]
 *     responses:
 *       200:
 *         description: List of policies
 *       401:
 *         description: Unauthorized
 */
router.get('/time-off/policies',               get_time_off_policies);

/**
 * @swagger
 * /timesheet/time-off:
 *   get:
 *     summary: List time-off requests (managers)
 *     tags: [Timesheets]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Time-off requests
 *       401:
 *         description: Unauthorized
 */
router.get('/time-off',                        MANAGER, list_time_off_ctrl);

/**
 * @swagger
 * /timesheet/time-off/request:
 *   post:
 *     summary: Submit a time-off request
 *     tags: [Timesheets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policy_id, start_date, end_date]
 *             properties:
 *               policy_id: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Time-off request submitted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/time-off/request',               time_off_request);

/**
 * @swagger
 * /timesheet/time-off/{id}/approve:
 *   post:
 *     summary: Approve a time-off request
 *     tags: [Timesheets]
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
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Request approved
 *       401:
 *         description: Unauthorized
 */
router.post('/time-off/:id/approve',           APPROVE, approve_time_off_ctrl);

/**
 * @swagger
 * /timesheet/time-off/{id}/reject:
 *   post:
 *     summary: Reject a time-off request
 *     tags: [Timesheets]
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
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Request rejected
 *       401:
 *         description: Unauthorized
 */
router.post('/time-off/:id/reject',            APPROVE, reject_time_off_ctrl);

/**
 * @swagger
 * /timesheet/entry:
 *   post:
 *     summary: Create a manual timesheet entry
 *     tags: [Timesheets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [check_in, check_out]
 *             properties:
 *               check_in: { type: string, format: date-time }
 *               check_out: { type: string, format: date-time }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Entry created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/entry',                          APPROVE, create_entry_ctrl);

/**
 * @swagger
 * /timesheet/entry/{id}:
 *   put:
 *     summary: Update a timesheet entry
 *     tags: [Timesheets]
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
 *               check_in: { type: string, format: date-time }
 *               check_out: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Entry updated
 *       401:
 *         description: Unauthorized
 */
router.put('/entry/:id',                       APPROVE, update_entry_ctrl);

/**
 * @swagger
 * /timesheet/entry/{id}:
 *   delete:
 *     summary: Delete a timesheet entry
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/entry/:id',                    APPROVE, delete_entry_ctrl);

/**
 * @swagger
 * /timesheet/entry/{id}/request:
 *   post:
 *     summary: Request edit approval for a timesheet entry
 *     tags: [Timesheets]
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Edit request submitted
 *       401:
 *         description: Unauthorized
 */
router.post('/entry/:id/request',              request_entry_edit);

/**
 * @swagger
 * /timesheet/edit-request/{id}/approve:
 *   post:
 *     summary: Approve a timesheet edit request
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Edit request approved
 *       401:
 *         description: Unauthorized
 */
router.post('/edit-request/:id/approve',       APPROVE, approve_edit);

/**
 * @swagger
 * /timesheet/edit-request/{id}/reject:
 *   post:
 *     summary: Reject a timesheet edit request
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Edit request rejected
 *       401:
 *         description: Unauthorized
 */
router.post('/edit-request/:id/reject',        APPROVE, reject_edit);

export default router;
