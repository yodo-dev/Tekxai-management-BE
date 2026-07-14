import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_ctrl, get_ctrl, list_ctrl, set_active_ctrl, update_ctrl } from '../controllers/ticket-categories.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.ticket-categories.view',   'ADMIN', 'SUPER_ADMIN', 'HR');
const MANAGE = can_or_role('erp.ticket-categories.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /ticket-categories:
 *   get:
 *     summary: List ticket categories
 *     tags: [Ticket Categories]
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: List of ticket categories }
 */
router.get('/', list_ctrl);

/**
 * @swagger
 * /ticket-categories:
 *   post:
 *     summary: Create a ticket category
 *     tags: [Ticket Categories]
 *     responses:
 *       201: { description: Category created }
 *       400: { description: Validation error }
 */
router.post('/', MANAGE, create_ctrl);

/**
 * @swagger
 * /ticket-categories/{id}:
 *   get:
 *     summary: Get a ticket category by ID
 *     tags: [Ticket Categories]
 *     responses:
 *       200: { description: Category object }
 *       404: { description: Not found }
 */
router.get('/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /ticket-categories/{id}:
 *   put:
 *     summary: Update a ticket category
 *     tags: [Ticket Categories]
 *     responses:
 *       200: { description: Category updated }
 */
router.put('/:id', MANAGE, update_ctrl);

/**
 * @swagger
 * /ticket-categories/{id}/active:
 *   patch:
 *     summary: Activate/deactivate a ticket category
 *     tags: [Ticket Categories]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Category updated }
 */
router.patch('/:id/active', MANAGE, set_active_ctrl);

export default router;
