import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import {
  create_update_ctrl, delete_update_ctrl, get_latest_update_ctrl, list_updates,
} from '../controllers/weekly-updates.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', list_updates);
router.get('/latest', get_latest_update_ctrl);
router.post('/', create_update_ctrl);
router.delete('/:updateId', delete_update_ctrl);

export default router;
