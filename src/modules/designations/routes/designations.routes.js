import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  bulk_delete_designations_ctrl,
  create_designation_ctrl,
  delete_designation_ctrl,
  get_designation_ctrl,
  get_designations_ctrl,
  update_designation_ctrl,
} from '../controllers/designations.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.designations.view',   'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const CREATE = can_or_role('erp.designations.create', 'ADMIN', 'SUPER_ADMIN', 'HR');
const EDIT   = can_or_role('erp.designations.edit',   'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /designations:
 *   get:
 *     summary: List all designations
 *     tags: [Designations]
 *     parameters:
 *       - in: query
 *         name: department_id
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of designations
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_designations_ctrl);

/**
 * @swagger
 * /designations:
 *   post:
 *     summary: Create a designation
 *     tags: [Designations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               department_id: { type: string }
 *               sort_order: { type: integer }
 *     responses:
 *       201:
 *         description: Designation created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', CREATE, create_designation_ctrl);

/**
 * @swagger
 * /designations/{id}:
 *   get:
 *     summary: Get designation by ID
 *     tags: [Designations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Designation object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_designation_ctrl);

/**
 * @swagger
 * /designations/{id}:
 *   put:
 *     summary: Update designation by ID
 *     tags: [Designations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Designation updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_designation_ctrl);

/**
 * @swagger
 * /designations/{id}:
 *   delete:
 *     summary: Delete designation by ID
 *     tags: [Designations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Designation deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', EDIT, delete_designation_ctrl);

/**
 * @swagger
 * /designations/bulk-delete:
 *   post:
 *     summary: Bulk delete designations, returns per-item results
 *     tags: [Designations]
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
router.post('/bulk-delete', EDIT, bulk_delete_designations_ctrl);

export default router;
