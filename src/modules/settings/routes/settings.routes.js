import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_my_settings, update_password, update_prefs } from '../controllers/settings.controller.js';
import prisma from '../../../shared/database/client.js';

const router = Router();

/**
 * @swagger
 * /settings/system/public:
 *   get:
 *     summary: Get public system settings (no auth required)
 *     tags: [Settings]
 *     security: []
 *     responses:
 *       200:
 *         description: Public settings
 */
router.get('/system/public', async (req, res, next) => {
  try {
    const rows = await prisma.system_settings.findMany({
      where: { key: { in: ['screenshot_interval_minutes', 'idle_timeout_minutes'] } },
    });
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return res.json({ success: true, payload: {
      screenshot_interval_minutes: map.screenshot_interval_minutes || '10',
      idle_timeout_minutes: map.idle_timeout_minutes || '15',
    }});
  } catch (e) { next(e); }
});

router.use(authenticate);

/**
 * @swagger
 * /settings/me:
 *   get:
 *     summary: Get current user's settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: User settings
 *       401:
 *         description: Unauthorized
 */
router.get('/me', get_my_settings);

/**
 * @swagger
 * /settings/preferences:
 *   patch:
 *     summary: Update user preferences
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme: { type: string, enum: [light, dark, system] }
 *               language: { type: string }
 *               notifications_enabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/preferences', update_prefs);

/**
 * @swagger
 * /settings/password:
 *   patch:
 *     summary: Update current user's password
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string }
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
router.patch('/password', update_password);

const SA = authorize('SUPER_ADMIN', 'ADMIN');

/**
 * @swagger
 * /settings/system:
 *   get:
 *     summary: Get all system settings (admin only)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: System settings key-value map
 *       401:
 *         description: Unauthorized
 */
router.get('/system', SA, async (req, res, next) => {
  try {
    const rows = await prisma.system_settings.findMany();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    if (!settings.screenshot_interval_minutes) settings.screenshot_interval_minutes = '10';
    return res.json({ success: true, payload: settings });
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /settings/system:
 *   put:
 *     summary: Update system settings (admin only)
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Key-value pairs of system settings
 *             example:
 *               screenshot_interval_minutes: "10"
 *     responses:
 *       200:
 *         description: Settings saved
 *       401:
 *         description: Unauthorized
 */
router.put('/system', SA, async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(entries.map(([key, value]) =>
      prisma.system_settings.upsert({
        where: { key },
        update: { value: String(value), updated_by: req.user.id },
        create: { key, value: String(value), updated_by: req.user.id },
      })
    ));
    return res.json({ success: true, message: 'Settings saved' });
  } catch (e) { next(e); }
});

export default router;
