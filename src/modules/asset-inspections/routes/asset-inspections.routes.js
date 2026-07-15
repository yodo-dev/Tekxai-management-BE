import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { complete_ctrl, create_ctrl, get_ctrl, history_ctrl, list_ctrl, update_ctrl } from '../controllers/asset-inspections.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.compliance.view',   'ADMIN', 'SUPER_ADMIN');
const MANAGE = can_or_role('erp.compliance.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /asset-inspections:
 *   get:
 *     summary: List asset inspections
 *     tags: [Asset Inspections]
 *     responses:
 *       200: { description: List of inspections }
 */
router.get('/', VIEW, list_ctrl);

/**
 * @swagger
 * /asset-inspections:
 *   post:
 *     summary: Schedule/create an inspection
 *     tags: [Asset Inspections]
 *     responses:
 *       201: { description: Inspection created }
 */
router.post('/', MANAGE, create_ctrl);

/**
 * @swagger
 * /asset-inspections/asset/{assetId}/history:
 *   get:
 *     summary: Full inspection history for one asset
 *     tags: [Asset Inspections]
 *     responses:
 *       200: { description: Inspection history }
 */
router.get('/asset/:assetId/history', VIEW, history_ctrl);

/**
 * @swagger
 * /asset-inspections/{id}:
 *   get:
 *     summary: Get an inspection by ID
 *     tags: [Asset Inspections]
 *     responses:
 *       200: { description: Inspection object }
 */
router.get('/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /asset-inspections/{id}:
 *   put:
 *     summary: Update an inspection (reassign/reschedule)
 *     tags: [Asset Inspections]
 *     responses:
 *       200: { description: Inspection updated }
 */
router.put('/:id', MANAGE, update_ctrl);

/**
 * @swagger
 * /asset-inspections/{id}/complete:
 *   post:
 *     summary: Complete an inspection — updates the asset's last/next inspection dates and logs a maintenance entry
 *     tags: [Asset Inspections]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checklist_result_id: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Inspection completed }
 */
router.post('/:id/complete', MANAGE, complete_ctrl);

export default router;
