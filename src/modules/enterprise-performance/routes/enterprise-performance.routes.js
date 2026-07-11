import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  get_business_unit_performance_ctrl,
  get_client_performance_ctrl,
  get_department_performance_ctrl,
  get_employee_performance_ctrl,
  get_project_performance_ctrl,
} from '../controllers/enterprise-performance.controller.js';

const router = Router();
router.use(authenticate);

// Performance Engine (Enterprise Performance Platform §11.3, Milestones 4-5) —
// management-visibility data (cost/revenue attribution), gated accordingly.
const VIEW = can_or_role('erp.enterprise_performance.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /enterprise-performance/employees/{userId}:
 *   get:
 *     summary: Employee Performance for a given month (Enterprise Performance Platform §11.3)
 *     tags: [EnterprisePerformance]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Employee performance (work, revenue attribution, cost)
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
router.get('/employees/:userId', VIEW, get_employee_performance_ctrl);

/**
 * @swagger
 * /enterprise-performance/projects/{projectId}:
 *   get:
 *     summary: Project Performance rollup for a given month
 *     tags: [EnterprisePerformance]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Project performance
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
router.get('/projects/:projectId', VIEW, get_project_performance_ctrl);

/**
 * @swagger
 * /enterprise-performance/clients/{clientId}:
 *   get:
 *     summary: Client Performance rollup for a given month
 *     tags: [EnterprisePerformance]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Client performance
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.get('/clients/:clientId', VIEW, get_client_performance_ctrl);

/**
 * @swagger
 * /enterprise-performance/departments/{departmentId}:
 *   get:
 *     summary: Department Performance rollup for a given month
 *     tags: [EnterprisePerformance]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Department performance
 *       404:
 *         description: Department not found
 *       401:
 *         description: Unauthorized
 */
router.get('/departments/:departmentId', VIEW, get_department_performance_ctrl);

/**
 * @swagger
 * /enterprise-performance/business-units/{unit}:
 *   get:
 *     summary: Business Unit Performance rollup for a given month
 *     tags: [EnterprisePerformance]
 *     parameters:
 *       - in: path
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Business Unit performance
 *       401:
 *         description: Unauthorized
 */
router.get('/business-units/:unit', VIEW, get_business_unit_performance_ctrl);

export default router;
