import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { list, mark_all, mark_one, remove } from '../controllers/notifications.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications for current user
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: unread_only
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Notifications list
 *       401:
 *         description: Unauthorized
 */
router.get('/', list);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/read-all', mark_all);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/read', mark_one);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', remove);

export default router;
