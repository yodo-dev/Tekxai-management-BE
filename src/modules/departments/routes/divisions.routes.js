import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { bulk_delete_divs, create_div, delete_div, get_div, get_all_divs, update_div } from '../controllers/departments.controller.js';

// Standalone division management — same owning module as Departments (People/Org Structure).
const router = Router();
router.use(authenticate);
const VIEW = can_or_role('erp.departments.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const EDIT = can_or_role('erp.departments.edit', 'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /divisions:
 *   get:
 *     summary: List all divisions (optionally filtered by department)
 *     tags: [Divisions]
 *     parameters:
 *       - in: query
 *         name: department_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of divisions
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_all_divs);

/**
 * @swagger
 * /divisions/{id}:
 *   get:
 *     summary: Get division by ID
 *     tags: [Divisions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Division object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_div);

/**
 * @swagger
 * /divisions/{id}:
 *   put:
 *     summary: Update division by ID
 *     tags: [Divisions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Division updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_div);

/**
 * @swagger
 * /divisions/{id}:
 *   delete:
 *     summary: Delete division by ID
 *     tags: [Divisions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Division deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', EDIT, delete_div);

/**
 * @swagger
 * /divisions/bulk-delete:
 *   post:
 *     summary: Bulk delete divisions (soft delete), returns per-item results
 *     tags: [Divisions]
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
router.post('/bulk-delete', EDIT, bulk_delete_divs);

export default router;
