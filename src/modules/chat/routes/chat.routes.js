import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import {
  add_reaction, create_channel, create_group, create_private_channel,
  delete_message, edit_message, get_channel, get_messages, get_or_create_dm,
  get_thread, join_channel, list_channels, list_members, list_users_for_chat,
  add_member, remove_member, update_member_role, update_channel, archive_channel,
  remove_reaction, send_message,
} from '../controllers/chat.controller.js';

const router = Router();
router.use(authenticate);

// Users for new chat
router.get('/users', list_users_for_chat);

// Channel CRUD
router.get('/channels', list_channels);
router.post('/channels', create_channel);
router.post('/channels/dm', get_or_create_dm);
router.post('/channels/group', create_group);
router.post('/channels/private', create_private_channel);
router.get('/channels/:id', get_channel);
router.put('/channels/:id', update_channel);
router.post('/channels/:id/archive', archive_channel);
router.post('/channels/:id/join', join_channel);

// Members
router.get('/channels/:id/members', list_members);
router.post('/channels/:id/members', add_member);
router.delete('/channels/:id/members/:memberId', remove_member);
router.put('/channels/:id/members/:memberId/role', update_member_role);

// Messages
router.get('/channels/:id/messages', get_messages);
router.post('/channels/:id/messages', send_message);
router.put('/channels/:id/messages/:msgId', edit_message);
router.delete('/channels/:id/messages/:msgId', delete_message);
router.get('/channels/:id/messages/:msgId/thread', get_thread);

// Reactions
router.post('/channels/:id/messages/:msgId/reactions', add_reaction);
router.delete('/channels/:id/messages/:msgId/reactions', remove_reaction);

export default router;
