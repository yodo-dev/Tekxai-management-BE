import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { list, mark_all, mark_one, remove } from '../controllers/notifications.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', list);
router.patch('/read-all', mark_all);
router.patch('/:id/read', mark_one);
router.delete('/:id', remove);
export default router;
