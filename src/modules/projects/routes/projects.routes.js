import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_project_ctrl,
  delete_project_ctrl,
  get_project_by_id,
  get_projects,
  get_saved_projects,
  save_project_ctrl,
  unsave_project_ctrl,
  update_project_ctrl,
} from '../controllers/projects.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN = authorize('ADMIN', 'SUPER_ADMIN');

router.get('/saved', get_saved_projects);
router.get('/',      get_projects);
router.get('/:id',   get_project_by_id);
router.post('/',     ADMIN, create_project_ctrl);
router.put('/:id',   ADMIN,   update_project_ctrl);
router.delete('/:id',ADMIN, delete_project_ctrl);
router.post('/:id/save',   save_project_ctrl);
router.delete('/:id/save', unsave_project_ctrl);

export default router;
