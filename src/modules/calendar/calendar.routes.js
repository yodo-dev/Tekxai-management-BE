import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { connect_calendar, calendar_status, disconnect_calendar, get_access_token } from './calendar.controller.js';

const router = Router();
router.use(authenticate);
router.post('/connect', connect_calendar);
router.get('/status', calendar_status);
router.delete('/disconnect', disconnect_calendar);
router.get('/token', get_access_token);
export default router;
