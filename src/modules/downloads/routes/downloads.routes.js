import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_latest, get_stats, track_download } from '../controllers/downloads.controller.js';

const router = Router();

const ADMIN = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /downloads/latest:
 *   get:
 *     summary: Get latest downloadable release (public)
 *     tags: [Downloads]
 *     security: []
 *     responses:
 *       200:
 *         description: Latest release info
 */
router.get('/latest', get_latest);

/**
 * @swagger
 * /downloads/track:
 *   post:
 *     summary: Track a download event (optionally authenticated)
 *     tags: [Downloads]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform: { type: string }
 *               version: { type: string }
 *     responses:
 *       200:
 *         description: Download tracked
 */
router.post('/track', (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    return authenticate(req, res, () => next());
  }
  next();
}, track_download);

/**
 * @swagger
 * /downloads/stats:
 *   get:
 *     summary: Get download statistics (admin only)
 *     tags: [Downloads]
 *     responses:
 *       200:
 *         description: Download stats
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, ADMIN, get_stats);

export default router;
