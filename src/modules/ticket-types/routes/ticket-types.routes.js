import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_ctrl, get_ctrl, list_ctrl, set_active_ctrl, update_ctrl } from '../controllers/ticket-types.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.ticket-types.view',   'ADMIN', 'SUPER_ADMIN', 'HR');
const MANAGE = can_or_role('erp.ticket-types.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /ticket-types:
 *   get:
 *     summary: List ticket types (dynamic form/workflow config)
 *     tags: [Ticket Types]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: include_inactive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: List of ticket types }
 */
router.get('/', list_ctrl);

/**
 * @swagger
 * /ticket-types:
 *   post:
 *     summary: Create a ticket type
 *     tags: [Ticket Types]
 *     responses:
 *       201: { description: Ticket type created }
 *       400: { description: Validation error }
 */
router.post('/', MANAGE, create_ctrl);

/**
 * @swagger
 * /ticket-types/{id}:
 *   get:
 *     summary: Get a ticket type by ID
 *     tags: [Ticket Types]
 *     responses:
 *       200: { description: Ticket type object }
 *       404: { description: Not found }
 */
router.get('/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /ticket-types/{id}:
 *   put:
 *     summary: Update a ticket type (field_schema/workflow/SLA/defaults)
 *     tags: [Ticket Types]
 *     responses:
 *       200: { description: Ticket type updated }
 *       400: { description: Validation error }
 */
router.put('/:id', MANAGE, update_ctrl);

/**
 * @swagger
 * /ticket-types/{id}/active:
 *   patch:
 *     summary: Activate/deactivate a ticket type
 *     tags: [Ticket Types]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Ticket type updated }
 */
router.patch('/:id/active', MANAGE, set_active_ctrl);

export default router;
