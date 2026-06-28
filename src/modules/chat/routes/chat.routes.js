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

/**
 * @swagger
 * /chat/users:
 *   get:
 *     summary: List users available for chat
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Users list
 *       401:
 *         description: Unauthorized
 */
router.get('/users', list_users_for_chat);

/**
 * @swagger
 * /chat/channels:
 *   get:
 *     summary: List chat channels
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Channels list
 *       401:
 *         description: Unauthorized
 */
router.get('/channels', list_channels);

/**
 * @swagger
 * /chat/channels:
 *   post:
 *     summary: Create a public channel
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Channel created
 *       401:
 *         description: Unauthorized
 */
router.post('/channels', create_channel);

/**
 * @swagger
 * /chat/channels/dm:
 *   post:
 *     summary: Get or create a direct message channel
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       200:
 *         description: DM channel
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/dm', get_or_create_dm);

/**
 * @swagger
 * /chat/channels/group:
 *   post:
 *     summary: Create a group channel
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, member_ids]
 *             properties:
 *               name: { type: string }
 *               member_ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Group created
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/group', create_group);

/**
 * @swagger
 * /chat/channels/private:
 *   post:
 *     summary: Create a private channel
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Private channel created
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/private', create_private_channel);

/**
 * @swagger
 * /chat/channels/{id}:
 *   get:
 *     summary: Get channel by ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Channel object
 *       401:
 *         description: Unauthorized
 */
router.get('/channels/:id', get_channel);

/**
 * @swagger
 * /chat/channels/{id}:
 *   put:
 *     summary: Update channel details
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Channel updated
 *       401:
 *         description: Unauthorized
 */
router.put('/channels/:id', update_channel);

/**
 * @swagger
 * /chat/channels/{id}/archive:
 *   post:
 *     summary: Archive a channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Channel archived
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/:id/archive', archive_channel);

/**
 * @swagger
 * /chat/channels/{id}/join:
 *   post:
 *     summary: Join a channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Joined channel
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/:id/join', join_channel);

/**
 * @swagger
 * /chat/channels/{id}/members:
 *   get:
 *     summary: List channel members
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Members list
 *       401:
 *         description: Unauthorized
 */
router.get('/channels/:id/members', list_members);

/**
 * @swagger
 * /chat/channels/{id}/members:
 *   post:
 *     summary: Add member to channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       201:
 *         description: Member added
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/:id/members', add_member);

/**
 * @swagger
 * /chat/channels/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove member from channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/channels/:id/members/:memberId', remove_member);

/**
 * @swagger
 * /chat/channels/{id}/members/{memberId}/role:
 *   put:
 *     summary: Update member role in channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: Role updated
 *       401:
 *         description: Unauthorized
 */
router.put('/channels/:id/members/:memberId/role', update_member_role);

/**
 * @swagger
 * /chat/channels/{id}/messages:
 *   get:
 *     summary: Get messages in a channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: before
 *         schema: { type: string }
 *         description: Cursor for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Messages list
 *       401:
 *         description: Unauthorized
 */
router.get('/channels/:id/messages', get_messages);

/**
 * @swagger
 * /chat/channels/{id}/messages:
 *   post:
 *     summary: Send a message to a channel
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               reply_to_id: { type: string }
 *     responses:
 *       201:
 *         description: Message sent
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/:id/messages', send_message);

/**
 * @swagger
 * /chat/channels/{id}/messages/{msgId}:
 *   put:
 *     summary: Edit a message
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message edited
 *       401:
 *         description: Unauthorized
 */
router.put('/channels/:id/messages/:msgId', edit_message);

/**
 * @swagger
 * /chat/channels/{id}/messages/{msgId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/channels/:id/messages/:msgId', delete_message);

/**
 * @swagger
 * /chat/channels/{id}/messages/{msgId}/thread:
 *   get:
 *     summary: Get thread replies for a message
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Thread messages
 *       401:
 *         description: Unauthorized
 */
router.get('/channels/:id/messages/:msgId/thread', get_thread);

/**
 * @swagger
 * /chat/channels/{id}/messages/{msgId}/reactions:
 *   post:
 *     summary: Add reaction to a message
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emoji]
 *             properties:
 *               emoji: { type: string }
 *     responses:
 *       200:
 *         description: Reaction added
 *       401:
 *         description: Unauthorized
 */
router.post('/channels/:id/messages/:msgId/reactions', add_reaction);

/**
 * @swagger
 * /chat/channels/{id}/messages/{msgId}/reactions:
 *   delete:
 *     summary: Remove reaction from a message
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reaction removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/channels/:id/messages/:msgId/reactions', remove_reaction);

export default router;
