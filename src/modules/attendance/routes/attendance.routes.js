import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  assign_shift_ctrl, get_my_attendance_summary, get_my_shift_ctrl,
  list_shifts_ctrl, list_violations_ctrl, upsert_shift_ctrl,
} from '../controllers/attendance.controller.js';

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/shifts',          list_shifts_ctrl);
router.post('/shifts',         MANAGER, upsert_shift_ctrl);
router.post('/shifts/assign',  MANAGER, assign_shift_ctrl);
router.get('/my-shift',        get_my_shift_ctrl);
router.get('/violations',      list_violations_ctrl);
router.get('/my-summary',      get_my_attendance_summary);

export default router;
