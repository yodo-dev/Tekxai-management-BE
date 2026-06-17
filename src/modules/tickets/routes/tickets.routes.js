import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_ticket_ctrl, get_ticket_ctrl, get_tickets, update_ticket_ctrl } from '../controllers/tickets.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', get_tickets);
router.post('/', create_ticket_ctrl);
router.get('/:id', get_ticket_ctrl);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'HR'), update_ticket_ctrl);
export default router;
