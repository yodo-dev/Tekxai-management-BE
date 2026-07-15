import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_template_ctrl, get_result_ctrl, get_template_ctrl, list_results_ctrl,
  list_templates_ctrl, submit_result_ctrl, update_template_ctrl,
} from '../controllers/checklists.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.compliance.view',   'ADMIN', 'SUPER_ADMIN');
const MANAGE = can_or_role('erp.compliance.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /checklists/templates:
 *   get:
 *     summary: List checklist templates (generic — entity_type filterable; only "asset" is exposed in the UI today)
 *     tags: [Checklists]
 *     parameters:
 *       - in: query
 *         name: entity_type
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of checklist templates }
 */
router.get('/templates', VIEW, list_templates_ctrl);

/**
 * @swagger
 * /checklists/templates:
 *   post:
 *     summary: Create a checklist template
 *     tags: [Checklists]
 *     responses:
 *       201: { description: Template created }
 */
router.post('/templates', MANAGE, create_template_ctrl);

/**
 * @swagger
 * /checklists/templates/{id}:
 *   get:
 *     summary: Get a checklist template by ID
 *     tags: [Checklists]
 *     responses:
 *       200: { description: Template object }
 */
router.get('/templates/:id', VIEW, get_template_ctrl);

/**
 * @swagger
 * /checklists/templates/{id}:
 *   put:
 *     summary: Update a checklist template
 *     tags: [Checklists]
 *     responses:
 *       200: { description: Template updated }
 */
router.put('/templates/:id', MANAGE, update_template_ctrl);

/**
 * @swagger
 * /checklists/results:
 *   get:
 *     summary: List checklist results (filter by entity_type/entity_id/template_id)
 *     tags: [Checklists]
 *     responses:
 *       200: { description: List of checklist results }
 */
router.get('/results', VIEW, list_results_ctrl);

/**
 * @swagger
 * /checklists/results/{id}:
 *   get:
 *     summary: Get a checklist result by ID
 *     tags: [Checklists]
 *     responses:
 *       200: { description: Result object }
 */
router.get('/results/:id', VIEW, get_result_ctrl);

/**
 * @swagger
 * /checklists/results:
 *   post:
 *     summary: Submit a checklist result for an entity (e.g. an asset)
 *     tags: [Checklists]
 *     responses:
 *       201: { description: Result recorded }
 *       400: { description: Validation error }
 */
router.post('/results', MANAGE, submit_result_ctrl);

export default router;
