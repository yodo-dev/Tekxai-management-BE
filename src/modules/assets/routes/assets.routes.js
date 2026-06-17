import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  add_maintenance_ctrl,
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

router.get('/categories', get_categories);
router.get('/locations', get_locations);
router.get('/vendors', get_vendors);
router.get('/', get_assets);
router.post('/', HR, create_asset_ctrl);
router.get('/:id', get_asset_ctrl);
router.put('/:id', HR, update_asset_ctrl);
router.delete('/:id', HR, delete_asset_ctrl);
router.post('/:id/assign', HR, assign_asset_ctrl);
router.post('/:id/return', HR, return_asset_ctrl);
router.post('/:id/maintenance', HR, add_maintenance_ctrl);

export default router;
