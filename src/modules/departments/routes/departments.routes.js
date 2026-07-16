import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import { bulk_delete_depts, create_dept, create_div, delete_dept, get_dept, get_departments, get_divs, update_dept } from '../controllers/departments.controller.js';

const router = Router();
router.use(authenticate);
const ADMIN = can_or_role('erp.departments.view', 'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: List all departments
 *     tags: [Departments]
 *     responses:
 *       200:
 *         description: List of departments
 *       401:
 *         description: Unauthorized
 */
router.get('/', get_departments);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a department
 *     tags: [Departments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Department created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', ADMIN, create_dept);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', get_dept);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update department by ID
 *     tags: [Departments]
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
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Department updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', ADMIN, update_dept);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete department by ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', ADMIN, delete_dept);

/**
 * @swagger
 * /departments/bulk-delete:
 *   post:
 *     summary: Bulk delete departments (soft delete), returns per-item results
 *     tags: [Departments]
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
router.post('/bulk-delete', ADMIN, bulk_delete_depts);

/**
 * @swagger
 * /departments/{id}/divisions:
 *   get:
 *     summary: List divisions in a department
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of divisions
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/divisions', get_divs);

/**
 * @swagger
 * /departments/{id}/divisions:
 *   post:
 *     summary: Create division in a department
 *     tags: [Departments]
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
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Division created
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/divisions', ADMIN, create_div);

export default router;
