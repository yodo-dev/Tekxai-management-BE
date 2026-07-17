import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { admin_or_project_owner } from '../../devops-access/controllers/devops-access.controller.js';
import {
  create_update_ctrl, delete_update_ctrl, get_latest_update_ctrl, list_updates,
} from '../controllers/weekly-updates.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', list_updates);
router.get('/latest', get_latest_update_ctrl);
// Only an admin or the project's own owner/leader may post or remove weekly
// client updates — previously any authenticated user could do this on any project.
router.post('/', admin_or_project_owner, create_update_ctrl);
router.delete('/:updateId', admin_or_project_owner, delete_update_ctrl);

export default router;
