import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_milestone_ctrl, delete_milestone_ctrl,
  list_milestones, update_milestone_ctrl,
} from '../controllers/milestones.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /project/{projectId}/milestones:
 *   get:
 *     summary: List milestones for a project
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of milestones
 *       401:
 *         description: Unauthorized
 */
router.get('/',                  list_milestones);

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
 *             required: [title, due_date]
 *             properties:
 *               title: { type: string }
 *               due_date: { type: string, format: date }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Milestone created
 *       400:
 *         description: Validation error
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               due_date: { type: string, format: date }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Milestone updated
 *       401:
 *         description: Unauthorized
 */
// Previously unguarded (only create/delete had the MANAGER check) — any
// authenticated user could update any project's milestones.
router.put('/:milestoneId',      MANAGER, update_milestone_ctrl);

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
