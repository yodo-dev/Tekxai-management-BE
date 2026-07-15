import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_ctrl, delete_ctrl, get_ctrl, list_ctrl, update_ctrl } from '../controllers/compliance-requirements.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.compliance.view',   'ADMIN', 'SUPER_ADMIN');
const MANAGE = can_or_role('erp.compliance.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /compliance-requirements:
 *   get:
 *     summary: List compliance requirements (what a location should have)
 *     tags: [Compliance Requirements]
 *     parameters:
 *       - in: query
 *         name: location_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of compliance requirements }
 */
router.get('/', VIEW, list_ctrl);

/**
 * @swagger
 * /compliance-requirements:
 *   post:
 *     summary: Create a compliance requirement for a location+category
 *     tags: [Compliance Requirements]
 *     responses:
 *       201: { description: Requirement created }
 *       400: { description: Validation error }
 *       409: { description: Requirement already exists for this location+category }
 */
router.post('/', MANAGE, create_ctrl);

/**
 * @swagger
 * /compliance-requirements/{id}:
 *   get:
 *     summary: Get a compliance requirement by ID
 *     tags: [Compliance Requirements]
 *     responses:
 *       200: { description: Requirement object }
 *       404: { description: Not found }
 */
router.get('/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /compliance-requirements/{id}:
 *   put:
 *     summary: Update a compliance requirement (quantity/status/notes)
 *     tags: [Compliance Requirements]
 *     responses:
 *       200: { description: Requirement updated }
 */
router.put('/:id', MANAGE, update_ctrl);

/**
 * @swagger
 * /compliance-requirements/{id}:
 *   delete:
 *     summary: Delete a compliance requirement
 *     tags: [Compliance Requirements]
 *     responses:
 *       200: { description: Requirement deleted }
 */
router.delete('/:id', MANAGE, delete_ctrl);

export default router;
