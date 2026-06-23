import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_designations_ctrl, get_full_record_ctrl, get_profile_ctrl, upsert_profile_ctrl } from '../controllers/hr-profile.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

router.get('/designations',   get_designations_ctrl);
router.get('/:userId',        ADMIN_HR, get_profile_ctrl);
router.put('/:userId',        ADMIN_HR, upsert_profile_ctrl);
router.get('/:userId/full',   ADMIN_HR, get_full_record_ctrl);

export default router;
