import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  bulk_delete_bus, create_bu, delete_bu, get_bu, get_business_units, update_bu,
} from '../controllers/business-units.controller.js';

const router = Router();
router.use(authenticate);

const VIEW = can_or_role('erp.business_units.view', 'ADMIN', 'SUPER_ADMIN', 'HR');
const CREATE = can_or_role('erp.business_units.create', 'ADMIN', 'SUPER_ADMIN');
const EDIT = can_or_role('erp.business_units.edit', 'ADMIN', 'SUPER_ADMIN');
const DELETE = can_or_role('erp.business_units.delete', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /business-units:
 *   get:
 *     summary: List all business units
 *     tags: [Business Units]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of business units
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_business_units);

/**
 * @swagger
 * /business-units:
 *   post:
 *     summary: Create a business unit
 *     tags: [Business Units]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               description: { type: string }
 *               is_active: { type: boolean }
 *               sort_order: { type: integer }
 *     responses:
 *       201:
 *         description: Business unit created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', CREATE, create_bu);

/**
 * @swagger
 * /business-units/{id}:
 *   get:
 *     summary: Get business unit by ID
 *     tags: [Business Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business unit object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_bu);

/**
 * @swagger
 * /business-units/{id}:
 *   put:
 *     summary: Update business unit by ID
 *     tags: [Business Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business unit updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_bu);

/**
 * @swagger
 * /business-units/{id}:
 *   delete:
 *     summary: Delete business unit by ID
 *     tags: [Business Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business unit deleted
 *       409:
 *         description: Still referenced by departments
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', DELETE, delete_bu);

/**
 * @swagger
 * /business-units/bulk-delete:
 *   post:
 *     summary: Bulk delete business units, returns per-item results
 *     tags: [Business Units]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Per-item delete results
 *       400:
 *         description: ids array required
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk-delete', DELETE, bulk_delete_bus);

export default router;
