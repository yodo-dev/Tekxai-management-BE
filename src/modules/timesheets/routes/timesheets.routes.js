import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  approve_edit,
  approve_time_off_ctrl,
  create_entry,
  delete_entry,
  get_time_off_policies,
  my_requests,
  reject_edit,
  reject_time_off_ctrl,
  request_entry_edit,
  requests,
  time_off_request,
  update_entry,
  weekly,
} from '../controllers/timesheets.controller.js';

const router = Router();
router.use(authenticate);

router.get('/weekly',                      weekly);
router.get('/requests',                    requests);
router.get('/my-requests',                 my_requests);
router.get('/time-off/policies',           get_time_off_policies);
router.post('/time-off/request',           time_off_request);
router.post('/time-off/:id/approve',       authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), approve_time_off_ctrl);
router.post('/time-off/:id/reject',        authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), reject_time_off_ctrl);
router.post('/entry',                      create_entry);
router.put('/entry/:id',                   update_entry);
router.delete('/entry/:id',                delete_entry);
router.post('/entry/:id/request',          request_entry_edit);
router.post('/edit-request/:id/approve',   authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), approve_edit);
router.post('/edit-request/:id/reject',    authorize('ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'), reject_edit);

export default router;
