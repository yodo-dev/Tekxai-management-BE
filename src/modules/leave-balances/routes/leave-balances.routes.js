import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_my_balances, get_user_balances_ctrl } from '../controllers/leave-balances.controller.js';

const router = Router();
router.use(authenticate);
router.get('/my', get_my_balances);
router.get('/:userId', authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), get_user_balances_ctrl);
export default router;
