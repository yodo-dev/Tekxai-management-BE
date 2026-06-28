import { Router } from 'express';
import { authenticate, can_or_role } from '../../shared/middleware/authenticate.js';
import { list_webhooks, create_webhook, update_webhook, delete_webhook, get_deliveries, test_webhook } from './webhooks.controller.js';

const router = Router();
router.use(authenticate);
const ADMIN = can_or_role('erp.users.view','ADMIN','SUPER_ADMIN');

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: List all webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhooks list
 *       401:
 *         description: Unauthorized
 */
router.get('/', ADMIN, list_webhooks);

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Create a webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, events]
 *             properties:
 *               url: { type: string, format: uri }
 *               events:
 *                 type: array
 *                 items: { type: string }
 *               secret: { type: string }
 *     responses:
 *       201:
 *         description: Webhook created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', ADMIN, create_webhook);

/**
 * @swagger
 * /webhooks/{id}:
 *   patch:
 *     summary: Update a webhook
 *     tags: [Webhooks]
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
 *               url: { type: string, format: uri }
 *               events:
 *                 type: array
 *                 items: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Webhook updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id', ADMIN, update_webhook);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Webhook deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', ADMIN, delete_webhook);

/**
 * @swagger
 * /webhooks/{id}/deliveries:
 *   get:
 *     summary: List webhook delivery attempts
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Delivery attempts list
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/deliveries', ADMIN, get_deliveries);

/**
 * @swagger
 * /webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook by sending a ping
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Test ping sent
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/test', ADMIN, test_webhook);

export default router;
