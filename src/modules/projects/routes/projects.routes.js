import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_project_ctrl,
  delete_project_ctrl,
  get_project_by_id,
  get_projects,
  get_saved_projects,
  save_project_ctrl,
  unsave_project_ctrl,
  update_project_ctrl,
  update_budget,
  request_extension_ctrl,
} from '../controllers/projects.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /projects/saved:
 *   get:
 *     summary: List saved/bookmarked projects for current user
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Saved projects list
 *       401:
 *         description: Unauthorized
 */
router.get('/saved', get_saved_projects);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List all projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Projects list
 *       401:
 *         description: Unauthorized
 */
router.get('/',      can_or_role('erp.projects.view',   'ADMIN', 'SUPER_ADMIN'), get_projects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',   can_or_role('erp.projects.view',   'ADMIN', 'SUPER_ADMIN'), get_project_by_id);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               budget: { type: number }
 *               status: { type: string }
 *     responses:
 *       201:
 *         description: Project created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',     can_or_role('erp.projects.create', 'ADMIN', 'SUPER_ADMIN'), create_project_ctrl);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update project by ID
 *     tags: [Projects]
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
 *               title: { type: string }
 *               status: { type: string }
 *               progress: { type: integer }
 *     responses:
 *       200:
 *         description: Project updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',   can_or_role('erp.projects.edit',   'ADMIN', 'SUPER_ADMIN'), update_project_ctrl);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id',can_or_role('erp.projects.delete', 'ADMIN', 'SUPER_ADMIN'), delete_project_ctrl);

/**
 * @swagger
 * /projects/{id}/save:
 *   post:
 *     summary: Bookmark a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project saved
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/save',      save_project_ctrl);

/**
 * @swagger
 * /projects/{id}/save:
 *   delete:
 *     summary: Remove project bookmark
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bookmark removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/save',    unsave_project_ctrl);

/**
 * @swagger
 * /projects/{id}/extension:
 *   post:
 *     summary: Request deadline extension for project
 *     tags: [Projects]
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
 *             properties:
 *               new_end_date: { type: string, format: date }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Extension requested
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/extension', request_extension_ctrl);

/**
 * @swagger
 * /projects/{id}/budget:
 *   patch:
 *     summary: Update project budget
 *     tags: [Projects]
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
 *             properties:
 *               budget: { type: number }
 *               currency: { type: string }
 *     responses:
 *       200:
 *         description: Budget updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/budget',   can_or_role('erp.projects.edit', 'ADMIN', 'SUPER_ADMIN'), update_budget);

export default router;
