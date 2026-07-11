import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { get_client_roi_ctrl, get_employee_roi_ctrl, get_project_roi_ctrl } from '../controllers/roi.controller.js';

const router = Router();
router.use(authenticate);

// ROI Engine (Enterprise Performance Platform §11.5, Milestone 6) — same
// management-visibility gating as the Performance Engine it's built on.
const VIEW = can_or_role('erp.roi.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /roi/employees/{userId}:
 *   get:
 *     summary: Employee ROI for a given month (value ÷ cost — one KPI computed from the Performance Engine, Enterprise Performance Platform §11.5)
 *     tags: [ROI]
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
 *         description: Employee ROI (includes full Performance Engine breakdown)
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
router.get('/employees/:userId', VIEW, get_employee_roi_ctrl);

/**
 * @swagger
 * /roi/projects/{projectId}:
 *   get:
 *     summary: Project ROI for a given month
 *     tags: [ROI]
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
 *         description: Project ROI
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
router.get('/projects/:projectId', VIEW, get_project_roi_ctrl);

/**
 * @swagger
 * /roi/clients/{clientId}:
 *   get:
 *     summary: Client ROI for a given month
 *     tags: [ROI]
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
 *         description: Client ROI
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.get('/clients/:clientId', VIEW, get_client_roi_ctrl);

export default router;
