import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import {
  add_maintenance_ctrl,
  list_all_maintenance_ctrl,
  assign_asset_ctrl,
  create_asset_ctrl,
  delete_asset_ctrl,
  get_asset_ctrl,
  get_assets,
  get_categories,
  get_locations,
  get_vendors,
  return_asset_ctrl,
  update_asset_ctrl,
} from '../controllers/assets.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/categories',       get_categories);
router.get('/locations',        get_locations);
router.get('/vendors',          get_vendors);
router.get('/',                 get_assets);
router.post('/',                HR, can('erp.assets.create'),   create_asset_ctrl);
router.get('/:id',              get_asset_ctrl);
router.put('/:id',              HR, can('erp.assets.edit'),     update_asset_ctrl);
router.delete('/:id',           HR, can('erp.assets.delete'),   delete_asset_ctrl);
router.post('/:id/assign',      HR, can('hr.assets.manage'),    assign_asset_ctrl);
router.post('/:id/return',      HR, can('hr.assets.manage'),    return_asset_ctrl);
router.get('/maintenance/all',  list_all_maintenance_ctrl);
router.post('/:id/maintenance', HR, can('erp.assets.edit'),     add_maintenance_ctrl);

export default router;
