import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  approve_edit,
  approve_time_off_ctrl,
  clock_in,
  clock_out,
  create_entry_ctrl,
  delete_entry_ctrl,
  force_checkout,
  get_time_off_policies,
  list_time_off_ctrl,
  my_requests,
  reject_edit,
  reject_time_off_ctrl,
  request_entry_edit,
  requests,
  time_off_request,
  today_entry,
  update_entry_ctrl,
  weekly,
} from '../controllers/timesheets.controller.js';

const router = Router();
router.use(authenticate);

const MANAGER = can_or_role('erp.timesheet.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const APPROVE = can_or_role('erp.timesheet.approve', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

// Attendance clock-in / clock-out
router.post('/clock-in',                       clock_in);
router.post('/clock-out',                      clock_out);
// Force-close any open entry (cross-day safe). reason: LOGOUT | IDLE_TIMEOUT | MANUAL
router.post('/force-checkout',                 force_checkout);
router.get('/today',                           today_entry);

// Weekly view
router.get('/weekly',                          weekly);

// Requests (admin: all; employee: own)
router.get('/requests',                        requests);
router.get('/my-requests',                     my_requests);

// Time-off
router.get('/time-off/policies',               get_time_off_policies);
router.get('/time-off',                        MANAGER, list_time_off_ctrl);
router.post('/time-off/request',               time_off_request);
router.post('/time-off/:id/approve',           APPROVE, approve_time_off_ctrl);
router.post('/time-off/:id/reject',            APPROVE, reject_time_off_ctrl);

// Manual entry CRUD
router.post('/entry',                          create_entry_ctrl);
router.put('/entry/:id',                       update_entry_ctrl);
router.delete('/entry/:id',                    delete_entry_ctrl);
router.post('/entry/:id/request',              request_entry_edit);

// Edit request approvals
router.post('/edit-request/:id/approve',       APPROVE, approve_edit);
router.post('/edit-request/:id/reject',        APPROVE, reject_edit);

export default router;
