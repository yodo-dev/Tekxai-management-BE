import { Router } from 'express';
import { authenticate, can_or_role } from '../../shared/middleware/authenticate.js';
import { list_runs, create_run, calculate_run, get_run, update_run_status, get_payslip } from './payroll.controller.js';

const router = Router();
router.use(authenticate);

const HR_ADMIN = can_or_role('erp.users.view', 'ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/',                              HR_ADMIN, list_runs);
router.post('/',                             HR_ADMIN, create_run);
router.get('/:id',                           HR_ADMIN, get_run);
router.post('/:id/calculate',               HR_ADMIN, calculate_run);
router.patch('/:id/status',                 HR_ADMIN, update_run_status);
router.get('/:id/entries/:entryId/payslip', get_payslip);

export default router;
