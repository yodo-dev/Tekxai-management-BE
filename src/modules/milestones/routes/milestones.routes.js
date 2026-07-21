import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  archive_milestone_ctrl, create_milestone_ctrl, delete_milestone_ctrl,
  list_milestones_ctrl, unarchive_milestone_ctrl, update_milestone_ctrl,
} from '../controllers/milestones.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /project/{projectId}/milestones:
 *   get:
 *     summary: List milestones for a project (excludes archived by default)
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: include_archived
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: List of milestones
 *       401:
 *         description: Unauthorized
 */
router.get('/',                  list_milestones_ctrl);

/**
 * @swagger
 * /project/{projectId}/milestones:
 *   post:
 *     summary: Create a milestone
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *               description: { type: string }
 *               sequence: { type: integer }
 *               status: { type: string, enum: [NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED] }
 *               due_date: { type: string, format: date }
 *               estimated_start: { type: string, format: date }
 *               estimated_end: { type: string, format: date }
 *               progress_percent: { type: integer }
 *               remarks: { type: string }
 *               assigned_user_ids: { type: array, items: { type: string } }
 *               depends_on_ids: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Milestone created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate sequence within the project
 *       401:
 *         description: Unauthorized
 */
router.post('/',                 MANAGER, create_milestone_ctrl);

/**
 * @swagger
 * /project/{projectId}/milestones/{milestoneId}:
 *   put:
 *     summary: Update a milestone
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone updated
 *       404:
 *         description: Not found
 *       409:
 *         description: Duplicate sequence within the project
 *       401:
 *         description: Unauthorized
 */
router.put('/:milestoneId',      MANAGER, update_milestone_ctrl);

/**
 * @swagger
 * /project/{projectId}/milestones/{milestoneId}/archive:
 *   patch:
 *     summary: Archive a milestone (hides it from the active list; not a delete)
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone archived
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:milestoneId/archive',   MANAGER, archive_milestone_ctrl);

/**
 * @swagger
 * /project/{projectId}/milestones/{milestoneId}/unarchive:
 *   patch:
 *     summary: Restore an archived milestone to the active list
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone unarchived
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:milestoneId/unarchive', MANAGER, unarchive_milestone_ctrl);

/**
 * @swagger
 * /project/{projectId}/milestones/{milestoneId}:
 *   delete:
 *     summary: Delete a milestone
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:milestoneId',   MANAGER, delete_milestone_ctrl);

export default router;
