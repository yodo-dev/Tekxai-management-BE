import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_grade_ctrl,
  delete_grade_ctrl,
  get_grade_ctrl,
  get_grades_ctrl,
  update_grade_ctrl,
} from '../controllers/grades.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.grades.view',   'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const CREATE = can_or_role('erp.grades.create', 'ADMIN', 'SUPER_ADMIN', 'HR');
const EDIT   = can_or_role('erp.grades.edit',   'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /grades:
 *   get:
 *     summary: List all grades (ordered by level)
 *     tags: [Grades]
 *     responses:
 *       200:
 *         description: List of grades
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_grades_ctrl);

/**
 * @swagger
 * /grades:
 *   post:
 *     summary: Create a grade
 *     tags: [Grades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, level]
 *             properties:
 *               name: { type: string }
 *               level: { type: integer }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Grade created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', CREATE, create_grade_ctrl);

/**
 * @swagger
 * /grades/{id}:
 *   get:
 *     summary: Get grade by ID
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Grade object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_grade_ctrl);

/**
 * @swagger
 * /grades/{id}:
 *   put:
 *     summary: Update grade by ID
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Grade updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_grade_ctrl);

/**
 * @swagger
 * /grades/{id}:
 *   delete:
 *     summary: Delete grade by ID
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Grade deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', EDIT, delete_grade_ctrl);

export default router;
