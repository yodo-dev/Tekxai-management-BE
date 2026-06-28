import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { connect_calendar, calendar_status, disconnect_calendar, get_access_token } from './calendar.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /calendar/connect:
 *   post:
 *     summary: Connect Google Calendar
 *     tags: [Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, description: OAuth authorization code }
 *     responses:
 *       200:
 *         description: Calendar connected
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized
 */
router.post('/connect', connect_calendar);

/**
 * @swagger
 * /calendar/status:
 *   get:
 *     summary: Check calendar connection status
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Connection status
 *       401:
 *         description: Unauthorized
 */
router.get('/status', calendar_status);

/**
 * @swagger
 * /calendar/disconnect:
 *   delete:
 *     summary: Disconnect Google Calendar
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Calendar disconnected
 *       401:
 *         description: Unauthorized
 */
router.delete('/disconnect', disconnect_calendar);

/**
 * @swagger
 * /calendar/token:
 *   get:
 *     summary: Get calendar access token
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Access token
 *       401:
 *         description: Unauthorized
 */
router.get('/token', get_access_token);

export default router;
