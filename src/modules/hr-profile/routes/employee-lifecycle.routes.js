import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  get_onboarding_readiness_ctrl, get_offboarding_readiness_ctrl, get_probation_summary_ctrl,
  move_to_probation_ctrl, enter_notice_period_ctrl, move_to_exit_clearance_ctrl, archive_employee_ctrl,
  request_confirm_employee_ctrl, request_extend_probation_ctrl, request_terminate_probation_ctrl, request_archive_employee_ctrl,
  set_stage_ctrl,
} from '../controllers/employee-lifecycle.controller.js';

const router = Router();
router.use(authenticate);

const VIEW = can_or_role('hr.lifecycle.view', 'SUPER_ADMIN', 'ADMIN', 'HR');
const MANAGE = can_or_role('hr.lifecycle.manage', 'SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /employee-lifecycle/{userId}/onboarding-readiness:
 *   get:
 *     summary: Compute-on-read onboarding readiness (tasks, profile, documents)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Readiness summary } }
 */
router.get('/:userId/onboarding-readiness', VIEW, get_onboarding_readiness_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/offboarding-readiness:
 *   get:
 *     summary: Compute-on-read offboarding readiness (checklist, assets, archive approval)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Readiness summary } }
 */
router.get('/:userId/offboarding-readiness', VIEW, get_offboarding_readiness_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/probation-summary:
 *   get:
 *     summary: Probation start/end/status/remaining days
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Probation summary } }
 */
router.get('/:userId/probation-summary', VIEW, get_probation_summary_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/move-to-probation:
 *   post:
 *     summary: ONBOARDING -> PROBATION (direct action, no approval gate)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Moved }, 409: { description: Wrong current stage } }
 */
router.post('/:userId/move-to-probation', MANAGE, move_to_probation_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/enter-notice-period:
 *   post:
 *     summary: ACTIVE_EMPLOYMENT -> NOTICE_PERIOD (direct action; seeds offboarding tasks, notifies HR + manager)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { notice_period_days: { type: integer } } }
 *     responses: { 200: { description: Moved }, 409: { description: Wrong current stage } }
 */
router.post('/:userId/enter-notice-period', MANAGE, enter_notice_period_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/move-to-exit-clearance:
 *   post:
 *     summary: NOTICE_PERIOD -> EXIT_CLEARANCE (direct action)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Moved }, 409: { description: Wrong current stage } }
 */
router.post('/:userId/move-to-exit-clearance', MANAGE, move_to_exit_clearance_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/archive:
 *   post:
 *     summary: EXIT_CLEARANCE -> ARCHIVED (hard-gated — checklist complete, no outstanding assets, approved Archive request required)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Archived }, 409: { description: A gate blocked the transition } }
 */
router.post('/:userId/archive', MANAGE, archive_employee_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/request-confirm:
 *   post:
 *     summary: Request approval to confirm this employee (PROBATION -> ACTIVE_EMPLOYMENT)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { reason: { type: string } } } } } }
 *     responses: { 201: { description: Approval request created }, 409: { description: Wrong current stage or already pending } }
 */
router.post('/:userId/request-confirm', MANAGE, request_confirm_employee_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/request-extend-probation:
 *   post:
 *     summary: Request approval to extend this employee's probation
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     requestBody: { content: { application/json: { schema: { type: object, required: [new_probation_end], properties: { new_probation_end: { type: string, format: date }, reason: { type: string } } } } } }
 *     responses: { 201: { description: Approval request created }, 409: { description: Wrong current stage or already pending } }
 */
router.post('/:userId/request-extend-probation', MANAGE, request_extend_probation_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/request-terminate-probation:
 *   post:
 *     summary: Request approval to terminate this employee during probation (PROBATION -> EXIT_CLEARANCE)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { reason: { type: string } } } } } }
 *     responses: { 201: { description: Approval request created }, 409: { description: Wrong current stage or already pending } }
 */
router.post('/:userId/request-terminate-probation', MANAGE, request_terminate_probation_ctrl);

/**
 * @swagger
 * /employee-lifecycle/{userId}/request-archive:
 *   post:
 *     summary: Request approval to archive this employee (EXIT_CLEARANCE -> ARCHIVED)
 *     tags: [Employee Lifecycle]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { reason: { type: string } } } } } }
 *     responses: { 201: { description: Approval request created }, 409: { description: Wrong current stage or already pending } }
 */
router.post('/:userId/request-archive', MANAGE, request_archive_employee_ctrl);

/**
 * @swagger
 * /employee-lifecycle/set-stage:
 *   post:
 *     summary: Direct admin override to set lifecycle stage for one or more employees (bypasses the approval-gated transitions above)
 *     tags: [Employee Lifecycle]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_ids: { type: array, items: { type: string } }
 *               lifecycle_stage: { type: string }
 *     responses: { 200: { description: Employees updated } }
 */
router.post('/set-stage', MANAGE, set_stage_ctrl);

export default router;
