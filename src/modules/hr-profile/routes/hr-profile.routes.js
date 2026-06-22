import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { get_designations_ctrl, get_full_record_ctrl, get_profile_ctrl, upsert_profile_ctrl } from '../controllers/hr-profile.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

router.get('/designations',   get_designations_ctrl);
router.get('/:userId',        ADMIN_HR, can('hr.employee_profiles.view'), get_profile_ctrl);
router.put('/:userId',        ADMIN_HR, can('hr.employee_profiles.edit'), upsert_profile_ctrl);
router.get('/:userId/full',   ADMIN_HR, can('hr.employees.view'),         get_full_record_ctrl);

export default router;
