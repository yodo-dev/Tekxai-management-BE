import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { end_session, get_productivity, list_screenshots, start_session, update_productivity, upload_screenshot, log_app_usage, get_app_usage } from '../controllers/monitoring.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /monitoring/session/start:
 *   post:
 *     summary: Start a monitoring session
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Session started
 *       401:
 *         description: Unauthorized
 */
router.post('/session/start', start_session);

/**
 * @swagger
 * /monitoring/session/{id}/end:
 *   post:
 *     summary: End a monitoring session
 *     tags: [Monitoring]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session ended
 *       401:
 *         description: Unauthorized
 */
router.post('/session/:id/end', end_session);

/**
 * @swagger
 * /monitoring/screenshot:
 *   post:
 *     summary: Upload a screenshot
 *     tags: [Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               session_id: { type: string }
 *     responses:
 *       200:
 *         description: Screenshot uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/screenshot', upload_screenshot);

/**
 * @swagger
 * /monitoring/screenshots:
 *   get:
 *     summary: List screenshots
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Screenshots list
 *       401:
 *         description: Unauthorized
 */
router.get('/screenshots', list_screenshots);

/**
 * @swagger
 * /monitoring/productivity:
 *   post:
 *     summary: Update productivity data
 *     tags: [Monitoring]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               active_mins: { type: integer }
 *               idle_mins: { type: integer }
 *               session_id: { type: string }
 *     responses:
 *       200:
 *         description: Productivity updated
 *       401:
 *         description: Unauthorized
 */
router.post('/productivity', update_productivity);

/**
 * @swagger
 * /monitoring/productivity:
 *   get:
 *     summary: Get productivity data
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Productivity data
 *       401:
 *         description: Unauthorized
 */
router.get('/productivity', get_productivity);

/**
 * @swagger
 * /monitoring/app-usage:
 *   post:
 *     summary: Log app usage activity
 *     tags: [Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               app_name: { type: string }
 *               duration_secs: { type: integer }
 *               session_id: { type: string }
 *     responses:
 *       200:
 *         description: App usage logged
 *       401:
 *         description: Unauthorized
 */
router.post('/app-usage', log_app_usage);

/**
 * @swagger
 * /monitoring/app-usage:
 *   get:
 *     summary: Get app usage data
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: App usage data
 *       401:
 *         description: Unauthorized
 */
router.get('/app-usage', get_app_usage);

export default router;
