import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_ticket_ctrl, get_ticket_ctrl, get_tickets, update_ticket_ctrl, add_attachment_ctrl, stats_ctrl } from '../controllers/tickets.controller.js';

const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

const router = Router();
router.use(authenticate);
router.get('/stats', ADMIN_HR, stats_ctrl);
router.get('/', get_tickets);
router.post('/', create_ticket_ctrl);
router.get('/:id', get_ticket_ctrl);
router.patch('/:id', ADMIN_HR, update_ticket_ctrl);
router.post('/:id/attachments', add_attachment_ctrl);
export default router;
