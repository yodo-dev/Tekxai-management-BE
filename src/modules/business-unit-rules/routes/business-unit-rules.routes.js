import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_business_unit_rule_ctrl,
  delete_business_unit_rule_ctrl,
  get_business_unit_rule_ctrl,
  get_business_unit_rule_by_unit_ctrl,
  get_business_unit_rules_ctrl,
  update_business_unit_rule_ctrl,
} from '../controllers/business-unit-rules.controller.js';

const router = Router();
router.use(authenticate);

// Business Unit Rule Engine (Enterprise Performance Platform §11.4) — admin-only,
// since these rules drive downstream Revenue/Cost/Performance attribution and
// should not be editable by general staff.
const VIEW   = can_or_role('erp.business_unit_rules.view',   'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const CREATE = can_or_role('erp.business_unit_rules.create', 'ADMIN', 'SUPER_ADMIN');
const EDIT   = can_or_role('erp.business_unit_rules.edit',   'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /business-unit-rules:
 *   get:
 *     summary: List Business Unit rules (Enterprise Performance Platform §11.4)
 *     tags: [BusinessUnitRules]
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of Business Unit rules
 *       401:
 *         description: Unauthorized
 */
router.get('/', VIEW, get_business_unit_rules_ctrl);

/**
 * @swagger
 * /business-unit-rules:
 *   post:
 *     summary: Create a Business Unit rule
 *     tags: [BusinessUnitRules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [business_unit]
 *             properties:
 *               business_unit: { type: string }
 *               default_allocation_method: { type: string, enum: [TIME_SHARE, FIXED_SHARE, HEADCOUNT_SHARE] }
 *               revenue_source_type: { type: string, enum: [INVOICE, RETAINER_ALLOCATION, MANUAL_ESTIMATE] }
 *               performance_weights: { type: object }
 *     responses:
 *       201:
 *         description: Business Unit rule created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', CREATE, create_business_unit_rule_ctrl);

/**
 * @swagger
 * /business-unit-rules/by-unit/{unit}:
 *   get:
 *     summary: Get the rule for a specific business unit (used by downstream Performance/ROI engines)
 *     tags: [BusinessUnitRules]
 *     parameters:
 *       - in: path
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Unit rule
 *       404:
 *         description: No rule configured for this unit
 *       401:
 *         description: Unauthorized
 */
router.get('/by-unit/:unit', VIEW, get_business_unit_rule_by_unit_ctrl);

/**
 * @swagger
 * /business-unit-rules/{id}:
 *   get:
 *     summary: Get a Business Unit rule by ID
 *     tags: [BusinessUnitRules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Unit rule
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', VIEW, get_business_unit_rule_ctrl);

/**
 * @swagger
 * /business-unit-rules/{id}:
 *   put:
 *     summary: Update a Business Unit rule
 *     tags: [BusinessUnitRules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Unit rule updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', EDIT, update_business_unit_rule_ctrl);

/**
 * @swagger
 * /business-unit-rules/{id}:
 *   delete:
 *     summary: Deactivate a Business Unit rule (soft)
 *     tags: [BusinessUnitRules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business Unit rule deactivated
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', EDIT, delete_business_unit_rule_ctrl);

export default router;
