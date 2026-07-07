import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { create_link_ctrl, delete_link_ctrl, list_links } from '../controllers/tracking-links.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', list_links);
router.post('/', create_link_ctrl);
router.delete('/:linkId', delete_link_ctrl);

export default router;
