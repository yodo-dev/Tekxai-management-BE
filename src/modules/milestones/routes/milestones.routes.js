import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_milestone_ctrl, delete_milestone_ctrl,
  list_milestones, update_milestone_ctrl,
} from '../controllers/milestones.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/',                  list_milestones);
router.post('/',                 MANAGER, create_milestone_ctrl);
router.put('/:milestoneId',      update_milestone_ctrl);
router.delete('/:milestoneId',   MANAGER, delete_milestone_ctrl);

export default router;
