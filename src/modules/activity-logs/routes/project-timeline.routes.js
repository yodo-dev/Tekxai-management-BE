import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { list_project_timeline_ctrl } from '../controllers/activity.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', list_project_timeline_ctrl);

export default router;
