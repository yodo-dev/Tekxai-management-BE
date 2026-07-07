import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import {
  admin_or_project_owner, get_devops_access_ctrl, update_devops_access_ctrl,
} from '../controllers/devops-access.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

/**
 * @swagger
 * /project/{projectId}/devops-access:
 *   get:
 *     summary: Get DevOps/client handoff access tracking for a project
 *     tags: [DevopsAccess]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: DevOps access tracking record (defaults if none saved yet)
 *       401:
 *         description: Unauthorized
 */
router.get('/', get_devops_access_ctrl);

/**
 * @swagger
 * /project/{projectId}/devops-access:
 *   put:
 *     summary: Create or update DevOps/client handoff access tracking for a project
 *     tags: [DevopsAccess]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               point_of_communication: { type: string, enum: [EMAIL, CLICKUP, OTHER] }
 *               progress_shared_to_client: { type: boolean }
 *               progress_shared_date: { type: string, format: date }
 *               git_access_status: { type: string, enum: [GRANTED, PENDING, NOT_APPLICABLE] }
 *               server_access_status: { type: string, enum: [GRANTED, PENDING, NOT_APPLICABLE] }
 *               domain_access_status: { type: string, enum: [GRANTED, PENDING, NOT_APPLICABLE] }
 *               email_smtp_access_status: { type: string, enum: [GRANTED, PENDING, NOT_APPLICABLE] }
 *               devops_remarks: { type: string }
 *     responses:
 *       200:
 *         description: DevOps access tracking updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.put('/', admin_or_project_owner, update_devops_access_ctrl);

export default router;
