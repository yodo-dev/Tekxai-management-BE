import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  accept_invite_ctrl,
  create_invite_ctrl,
  delete_invite_ctrl,
  get_invite_by_id,
  get_invites,
  preview_invite_token,
  redeem_invite_ctrl,
  update_invite_ctrl,
} from '../controllers/invites.controller.js';

const router = Router();
const ADMIN = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

// Public (no auth) – token preview and redeem are open
router.get('/token/:token/preview', preview_invite_token);
router.post('/redeem', redeem_invite_ctrl);

// Authenticated routes
router.use(authenticate);
router.get('/', ADMIN, get_invites);
router.post('/', ADMIN, create_invite_ctrl);
router.get('/:id', ADMIN, get_invite_by_id);
router.put('/:id', ADMIN, update_invite_ctrl);
router.delete('/:id', ADMIN, delete_invite_ctrl);
router.post('/:id/accept', accept_invite_ctrl);

export default router;
