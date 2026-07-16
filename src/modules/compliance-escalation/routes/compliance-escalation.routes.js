import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_ctrl,
  delete_ctrl,
  get_ctrl,
  history_ctrl,
  list_ctrl,
  run_now_ctrl,
  update_ctrl,
} from '../controllers/compliance-escalation.controller.js';

const router = Router();
router.use(authenticate);
const VIEW   = can_or_role('erp.compliance.escalation.view',   'ADMIN', 'SUPER_ADMIN');
const MANAGE = can_or_role('erp.compliance.escalation.manage', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /compliance-escalation/policies:
 *   get:
 *     summary: List escalation policies
 *     tags: [Compliance Escalation]
 *     responses:
 *       200: { description: List of escalation policies }
 */
router.get('/policies', VIEW, list_ctrl);

/**
 * @swagger
 * /compliance-escalation/policies:
 *   post:
 *     summary: Create an escalation policy
 *     tags: [Compliance Escalation]
 *     responses:
 *       201: { description: Policy created }
 *       400: { description: Validation error }
 *       409: { description: Policy key already exists }
 */
router.post('/policies', MANAGE, create_ctrl);

/**
 * @swagger
 * /compliance-escalation/policies/{id}:
 *   get:
 *     summary: Get an escalation policy by ID
 *     tags: [Compliance Escalation]
 *     responses:
 *       200: { description: Policy object }
 *       404: { description: Not found }
 */
router.get('/policies/:id', VIEW, get_ctrl);

/**
 * @swagger
 * /compliance-escalation/policies/{id}:
 *   put:
 *     summary: Update an escalation policy
 *     tags: [Compliance Escalation]
 *     responses:
 *       200: { description: Policy updated }
 */
router.put('/policies/:id', MANAGE, update_ctrl);

/**
 * @swagger
 * /compliance-escalation/policies/{id}:
 *   delete:
 *     summary: Delete an escalation policy
 *     tags: [Compliance Escalation]
 *     responses:
 *       200: { description: Policy deleted }
 */
router.delete('/policies/:id', MANAGE, delete_ctrl);

/**
 * @swagger
 * /compliance-escalation/history:
 *   get:
 *     summary: List escalation history (per-entity stage tracking)
 *     tags: [Compliance Escalation]
 *     parameters:
 *       - in: query
 *         name: entity_type
 *         schema: { type: string }
 *       - in: query
 *         name: alert_type
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of escalation tracker rows }
 */
router.get('/history', VIEW, history_ctrl);

/**
 * @swagger
 * /compliance-escalation/run:
 *   post:
 *     summary: Manually trigger the escalation engine (same code path the daily scheduler uses)
 *     tags: [Compliance Escalation]
 *     responses:
 *       200: { description: Escalation run results per policy key }
 */
router.post('/run', MANAGE, run_now_ctrl);

export default router;
