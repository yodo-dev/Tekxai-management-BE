import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  get_definitions,
  get_matrix,
  get_my_permissions,
  get_role,
  update_role,
  get_user_permissions_ctrl,
  set_user_permission_ctrl,
  delete_user_permission_ctrl,
  delete_all_user_permissions_ctrl,
} from '../controllers/permissions.controller.js';

const router = Router();
router.use(authenticate);

const SUPER_ADMIN_ONLY = authorize('SUPER_ADMIN');
const ADMIN_LEVEL      = authorize('SUPER_ADMIN', 'ADMIN');

// Any authenticated user fetches their own effective permissions
router.get('/my-permissions',    get_my_permissions);

// Admin-level read
router.get('/definitions',       ADMIN_LEVEL, get_definitions);
router.get('/',                  ADMIN_LEVEL, get_matrix);

// User override management (Super Admin only)
router.get('/users/:userId',     SUPER_ADMIN_ONLY, get_user_permissions_ctrl);
router.put('/users/:userId',     SUPER_ADMIN_ONLY, set_user_permission_ctrl);
router.delete('/users/:userId/:permission', SUPER_ADMIN_ONLY, delete_user_permission_ctrl);
router.delete('/users/:userId',  SUPER_ADMIN_ONLY, delete_all_user_permissions_ctrl);

// Must come after /users/:userId to avoid param conflict
router.get('/:roleName',         ADMIN_LEVEL, get_role);
router.put('/:roleName',         SUPER_ADMIN_ONLY, update_role);

export default router;
