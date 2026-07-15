import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { apply_ctrl, create_ctrl, create_version_ctrl, get_ctrl, list_ctrl, set_active_ctrl } from '../controllers/compliance-templates.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.compliance.view',   'ADMIN', 'SUPER_ADMIN');
const MANAGE = can_or_role('erp.compliance.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /compliance-templates:
 *   get:
 *     summary: List compliance requirement templates (latest version of each, unless include_all_versions=true)
 *     tags: [Compliance Templates]
 *     responses:
 *       200: { description: List of templates }
 */
router.get('/', VIEW, list_ctrl);

/**
 * @swagger
 * /compliance-templates:
 *   post:
 *     summary: Create a new compliance template (v1)
 *     tags: [Compliance Templates]
 *     responses:
 *       201: { description: Template created }
 */
router.post('/', MANAGE, create_ctrl);

/**
 * @swagger
 * /compliance-templates/{id}:
 *   get:
 *     summary: Get a compliance template by ID
 *     tags: [Compliance Templates]
 *     responses:
 *       200: { description: Template object }
 */
router.get('/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /compliance-templates/{key}/versions:
 *   post:
 *     summary: Publish a new version of an existing template (does not affect locations that already applied an older version)
 *     tags: [Compliance Templates]
 *     responses:
 *       201: { description: New version created }
 */
router.post('/:key/versions', MANAGE, create_version_ctrl);

/**
 * @swagger
 * /compliance-templates/{id}/active:
 *   patch:
 *     summary: Activate/deactivate a template version
 *     tags: [Compliance Templates]
 *     responses:
 *       200: { description: Template updated }
 */
router.patch('/:id/active', MANAGE, set_active_ctrl);

/**
 * @swagger
 * /compliance-templates/{id}/apply:
 *   post:
 *     summary: Apply a template to a location (one-time expansion into compliance_requirements)
 *     tags: [Compliance Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [location_id]
 *             properties:
 *               location_id: { type: string }
 *     responses:
 *       201: { description: Requirements created/updated at the location }
 */
router.post('/:id/apply', MANAGE, apply_ctrl);

export default router;
