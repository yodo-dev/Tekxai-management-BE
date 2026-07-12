import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import { get_executive_dashboard_ctrl } from '../controllers/executive-analytics.controller.js';

const router = Router();
router.use(authenticate);

// Executive Analytics (Enterprise Performance Platform §11.5, Milestone 7) —
// composes the Post-Sales Dashboard's existing sections plus the Performance/ROI
// Engines (Phases 2-3), so it gets the same management-visibility gate as those.
const VIEW = can_or_role('erp.executive-analytics.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /executive-analytics/dashboard:
 *   get:
 *     summary: Executive dashboard — Capacity, Delivery Health, Client Health (reused from Post-Sales Dashboard) plus ROI/Performance summary (Enterprise Performance Platform §11.5, Milestone 7)
 *     tags: [Executive Analytics]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Executive dashboard payload
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', VIEW, get_executive_dashboard_ctrl);

export default router;
