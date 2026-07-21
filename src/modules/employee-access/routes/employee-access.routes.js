import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_access_item_ctrl, delete_access_item_ctrl,
  list_access_items_ctrl, update_access_item_ctrl,
} from '../controllers/employee-access.controller.js';

const router = Router();
router.use(authenticate);

const VIEW = can_or_role('hr.lifecycle.view', 'SUPER_ADMIN', 'ADMIN', 'HR');
const MANAGE = can_or_role('hr.lifecycle.manage', 'SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /employee-access/{userId}:
 *   get:
 *     summary: List an employee's tracked access items (GitHub, Slack, AWS, ...)
 *     tags: [Employee Access]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of access items
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', VIEW, list_access_items_ctrl);

/**
 * @swagger
 * /employee-access/{userId}:
 *   post:
 *     summary: Add an access item for an employee
 *     tags: [Employee Access]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform]
 *             properties:
 *               platform: { type: string, enum: [GITHUB, GITLAB, BITBUCKET, SLACK, MICROSOFT_365, GOOGLE_WORKSPACE, VPN, AWS, AZURE, DIGITALOCEAN, OPENAI, CLAUDE, SMTP, DATABASE, JIRA, CLICKUP, FIGMA, HUBSTAFF, OTHER] }
 *               identifier: { type: string }
 *               status: { type: string, enum: [ACTIVE, REVOKED, PENDING] }
 *               granted_date: { type: string, format: date }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Access item created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:userId', MANAGE, create_access_item_ctrl);

/**
 * @swagger
 * /employee-access/{userId}/{itemId}:
 *   put:
 *     summary: Update an access item (e.g. revoke access)
 *     tags: [Employee Access]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Access item updated
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId/:itemId', MANAGE, update_access_item_ctrl);

/**
 * @swagger
 * /employee-access/{userId}/{itemId}:
 *   delete:
 *     summary: Remove an access item
 *     tags: [Employee Access]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Access item deleted
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId/:itemId', MANAGE, delete_access_item_ctrl);

export default router;
