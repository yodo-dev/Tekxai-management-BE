import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import {
  create_discussion_ctrl, delete_discussion_ctrl, get_communication_timeline_ctrl, list_discussions,
} from '../controllers/project-discussions.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

/**
 * @swagger
 * /project/{projectId}/discussions:
 *   get:
 *     summary: List project discussion notes
 *     tags: [ProjectDiscussions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of discussion notes
 *       401:
 *         description: Unauthorized
 */
router.get('/',                     list_discussions);

/**
 * @swagger
 * /project/{projectId}/discussions:
 *   post:
 *     summary: Add a project discussion note
 *     tags: [ProjectDiscussions]
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
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               parent_id: { type: string }
 *     responses:
 *       201:
 *         description: Note created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',                    create_discussion_ctrl);

/**
 * @swagger
 * /project/{projectId}/discussions/{discussionId}:
 *   delete:
 *     summary: Delete a project discussion note (own note, or admin)
 *     tags: [ProjectDiscussions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Note deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:discussionId',     delete_discussion_ctrl);

export default router;
