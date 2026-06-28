import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  create_project_ctrl,
  delete_project_ctrl,
  get_project_by_id,
  get_projects,
  get_saved_projects,
  save_project_ctrl,
  unsave_project_ctrl,
  update_project_ctrl,
  request_extension_ctrl,
} from '../controllers/projects.controller.js';

const router = Router();
router.use(authenticate);

router.get('/saved', get_saved_projects);
router.get('/',      can_or_role('erp.projects.view',   'ADMIN', 'SUPER_ADMIN'), get_projects);
router.get('/:id',   can_or_role('erp.projects.view',   'ADMIN', 'SUPER_ADMIN'), get_project_by_id);
router.post('/',     can_or_role('erp.projects.create', 'ADMIN', 'SUPER_ADMIN'), create_project_ctrl);
router.put('/:id',   can_or_role('erp.projects.edit',   'ADMIN', 'SUPER_ADMIN'), update_project_ctrl);
router.delete('/:id',can_or_role('erp.projects.delete', 'ADMIN', 'SUPER_ADMIN'), delete_project_ctrl);
router.post('/:id/save',      save_project_ctrl);
router.delete('/:id/save',    unsave_project_ctrl);
router.post('/:id/extension', request_extension_ctrl);

export default router;
