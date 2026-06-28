import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_ticket_ctrl, get_ticket_ctrl, get_tickets, update_ticket_ctrl, add_attachment_ctrl, stats_ctrl, add_reply_ctrl } from '../controllers/tickets.controller.js';

const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /tickets/stats:
 *   get:
 *     summary: Get ticket statistics
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Ticket stats
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', ADMIN_HR, stats_ctrl);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: List tickets (own or all for admin)
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tickets list
 *       401:
 *         description: Unauthorized
 */
router.get('/', get_tickets);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Ticket created
 *       401:
 *         description: Unauthorized
 */
router.post('/', create_ticket_ctrl);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', get_ticket_ctrl);

/**
 * @swagger
 * /tickets/{id}:
 *   patch:
 *     summary: Update a ticket (admin)
 *     tags: [Tickets]
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
 *               status: { type: string }
 *               assignee_id: { type: string }
 *               priority: { type: string }
 *     responses:
 *       200:
 *         description: Ticket updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id', ADMIN_HR, update_ticket_ctrl);

/**
 * @swagger
 * /tickets/{id}/attachments:
 *   post:
 *     summary: Add attachment to a ticket
 *     tags: [Tickets]
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
 *               file_url: { type: string }
 *               file_name: { type: string }
 *     responses:
 *       201:
 *         description: Attachment added
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/attachments', add_attachment_ctrl);

/**
 * @swagger
 * /tickets/{id}/replies:
 *   post:
 *     summary: Add reply to a ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Reply added
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/replies', add_reply_ctrl);

export default router;
