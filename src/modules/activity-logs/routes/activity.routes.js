import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { list_activity_ctrl, list_my_activity_ctrl } from '../controllers/activity.controller.js';
const router=Router(); router.use(authenticate);
router.get('/',list_activity_ctrl); router.get('/my',list_my_activity_ctrl);
export default router;
