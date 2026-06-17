import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  approve_bonus_ctrl,
  calc_bonus,
  get_bonus,
  get_reports,
  get_score_for_employee,
  get_scores,
  patch_report,
  pay_bonus_ctrl,
  post_report,
  post_score,
} from '../controllers/performance.controller.js';

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/daily-report', get_reports);
router.post('/daily-report', post_report);
router.put('/daily-report/:id', patch_report);

router.get('/score', get_scores);
router.get('/score/:employeeId', MANAGER, get_score_for_employee);
router.post('/score', MANAGER, post_score);

router.get('/bonus', get_bonus);
router.post('/bonus/calculate', MANAGER, calc_bonus);
router.post('/bonus/:id/approve', MANAGER, approve_bonus_ctrl);
router.post('/bonus/:id/pay', authorize('ADMIN', 'SUPER_ADMIN'), pay_bonus_ctrl);

export default router;
