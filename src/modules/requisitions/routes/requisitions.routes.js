import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { approve_ctrl, create_ctrl, get_ctrl, get_meta_ctrl, list_ctrl, status_ctrl, submit_ctrl, update_ctrl, convert_to_asset_ctrl, update_cost_ctrl, stats_ctrl } from '../controllers/requisitions.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

router.get('/meta',                ADMIN_HR, get_meta_ctrl);
router.get('/stats',               ADMIN_HR, stats_ctrl);
router.get('/',                    ADMIN_HR,    list_ctrl);
router.post('/',   create_ctrl);
router.get('/:id',                 get_ctrl);
router.put('/:id',                 update_ctrl);
router.post('/:id/submit',         submit_ctrl);
router.post('/:id/approve',        ADMIN_HR, approve_ctrl);
router.patch('/:id/status',        ADMIN_HR, status_ctrl);
router.patch('/:id/cost',          ADMIN_HR, update_cost_ctrl);
router.post('/:id/convert-to-asset', ADMIN_HR,     convert_to_asset_ctrl);

export default router;
