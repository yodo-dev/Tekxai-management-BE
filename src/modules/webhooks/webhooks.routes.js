import { Router } from 'express';
import { authenticate, can_or_role } from '../../shared/middleware/authenticate.js';
import { list_webhooks, create_webhook, update_webhook, delete_webhook, get_deliveries, test_webhook } from './webhooks.controller.js';

const router = Router();
router.use(authenticate);
const ADMIN = can_or_role('erp.users.view','ADMIN','SUPER_ADMIN');

router.get('/', ADMIN, list_webhooks);
router.post('/', ADMIN, create_webhook);
router.patch('/:id', ADMIN, update_webhook);
router.delete('/:id', ADMIN, delete_webhook);
router.get('/:id/deliveries', ADMIN, get_deliveries);
router.post('/:id/test', ADMIN, test_webhook);

export default router;
