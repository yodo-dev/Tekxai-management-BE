import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { get_my_settings, update_password, update_prefs } from '../controllers/settings.controller.js';

const router = Router();
router.use(authenticate);
router.get('/me', get_my_settings);
router.patch('/preferences', update_prefs);
router.patch('/password', update_password);
export default router;
