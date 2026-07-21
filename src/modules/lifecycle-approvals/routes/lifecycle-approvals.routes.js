import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { approve_approval_ctrl, list_approvals_ctrl, reject_approval_ctrl } from '../controllers/lifecycle-approvals.controller.js';

const router = Router();
router.use(authenticate);

const VIEW = can_or_role('hr.lifecycle.view', 'SUPER_ADMIN', 'ADMIN', 'HR');
const APPROVE = can_or_role('hr.lifecycle.approve', 'SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /lifecycle-approvals:
 *   get:
 *     summary: List lifecycle approval requests
 *     tags: [Lifecycle Approvals]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated approval requests
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, list_approvals_ctrl);

/**
 * @swagger
 * /lifecycle-approvals/{id}/approve:
 *   post:
 *     summary: Approve a lifecycle approval request and execute the underlying transition
 *     tags: [Lifecycle Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Approved and transition applied
 *       404:
 *         description: Not found
 *       409:
 *         description: Request is not pending, or a downstream gate blocks the transition
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/approve', APPROVE, approve_approval_ctrl);

/**
 * @swagger
 * /lifecycle-approvals/{id}/reject:
 *   post:
 *     summary: Reject a lifecycle approval request
 *     tags: [Lifecycle Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rejected
 *       404:
 *         description: Not found
 *       409:
 *         description: Request is not pending
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/reject', APPROVE, reject_approval_ctrl);

export default router;
