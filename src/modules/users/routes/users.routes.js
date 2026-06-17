import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_user_ctrl, delete_user_ctrl, get_user_by_id, get_users, update_user_ctrl } from '../controllers/users.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',     authorize('ADMIN', 'SUPER_ADMIN'), get_users);
router.get('/:id',  get_user_by_id);
router.post('/',    authorize('ADMIN', 'SUPER_ADMIN'), create_user_ctrl);
router.put('/:id',  authorize('ADMIN', 'SUPER_ADMIN'), update_user_ctrl);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), delete_user_ctrl);

export default router;
