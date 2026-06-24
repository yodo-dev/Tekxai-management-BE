import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_my_settings, update_password, update_prefs } from '../controllers/settings.controller.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
router.get('/me', get_my_settings);
router.patch('/preferences', update_prefs);
router.patch('/password', update_password);

const SA = authorize('SUPER_ADMIN', 'ADMIN');

// GET /settings/system — get all system settings (key-value pairs)
router.get('/system', SA, async (req, res, next) => {
  try {
    const rows = await prisma.system_settings.findMany();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    // Defaults
    if (!settings.screenshot_interval_minutes) settings.screenshot_interval_minutes = '10';
    return res.json({ success: true, payload: settings });
  } catch (e) { next(e); }
});

// PUT /settings/system — upsert one or more system settings
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

// GET /settings/system/public — unauthenticated subset (screenshot interval for desktop agent)
router.get('/system/public', async (req, res, next) => {
  try {
    const row = await prisma.system_settings.findUnique({ where: { key: 'screenshot_interval_minutes' } });
    return res.json({ success: true, payload: { screenshot_interval_minutes: row?.value || '10' } });
  } catch (e) { next(e); }
});

export default router;
