import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { get_queries, star_item_ctrl, unstar_item_ctrl } from '../controllers/starred.controller.js';

const router = Router();
router.use(authenticate);
router.get('/queries', get_queries);
router.post('/:item_type/:id', star_item_ctrl);
router.delete('/:item_type/:id', unstar_item_ctrl);
export default router;
