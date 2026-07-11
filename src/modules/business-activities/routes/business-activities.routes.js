import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_business_activity_ctrl,
  delete_business_activity_ctrl,
  get_business_activities_ctrl,
  get_business_activity_ctrl,
  update_business_activity_ctrl,
} from '../controllers/business-activities.controller.js';

const router = Router();
router.use(authenticate);

// Every authenticated user can view the list — it's a reference taxonomy used
// when logging time (task_time_logs.business_activity_id), not admin-only data.
const VIEW   = can_or_role('erp.business_activities.view',   'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'MARKETING');
const CREATE = can_or_role('erp.business_activities.create', 'ADMIN', 'SUPER_ADMIN');
const EDIT   = can_or_role('erp.business_activities.edit',   'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /business-activities:
 *   get:
 *     summary: List Business Activities (generic work taxonomy — Enterprise Performance Platform §11.2)
 *     tags: [BusinessActivities]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: feeds_layer
 *         schema: { type: string, enum: [REVENUE, VALUE, COST_ONLY] }
 *       - in: query
 *         name: active_only
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of Business Activities
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_business_activities_ctrl);

/**
 * @swagger
 * /business-activities:
 *   post:
 *     summary: Create a Business Activity
 *     tags: [BusinessActivities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               default_billable: { type: boolean }
 *               feeds_layer: { type: string, enum: [REVENUE, VALUE, COST_ONLY] }
 *               sort_order: { type: integer }
 *     responses:
 *       201:
 *         description: Business Activity created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', CREATE, create_business_activity_ctrl);

/**
 * @swagger
 * /business-activities/{id}:
 *   get:
 *     summary: Get a Business Activity by ID
 *     tags: [BusinessActivities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Activity object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_business_activity_ctrl);

/**
 * @swagger
 * /business-activities/{id}:
 *   put:
 *     summary: Update a Business Activity
 *     tags: [BusinessActivities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Activity updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_business_activity_ctrl);

/**
 * @swagger
 * /business-activities/{id}:
 *   delete:
 *     summary: Deactivate a Business Activity (soft — preserves historical time-log references)
 *     tags: [BusinessActivities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Activity deactivated
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', EDIT, delete_business_activity_ctrl);

export default router;
