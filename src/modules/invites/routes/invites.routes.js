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

/**
 * @swagger
 * /invites/token/{token}/preview:
 *   get:
 *     summary: Preview invite details by token (public)
 *     tags: [Invites]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invite preview
 *       404:
 *         description: Invalid or expired token
 */
router.get('/token/:token/preview', preview_invite_token);

/**
 * @swagger
 * /invites/redeem:
 *   post:
 *     summary: Redeem an invite token (public)
 *     tags: [Invites]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Invite redeemed, account created
 *       400:
 *         description: Invalid token
 */
router.post('/redeem', redeem_invite_ctrl);

router.use(authenticate);

/**
 * @swagger
 * /invites:
 *   get:
 *     summary: List all invites
 *     tags: [Invites]
 *     responses:
 *       200:
 *         description: Invites list
 *       401:
 *         description: Unauthorized
 */
router.get('/', ADMIN, get_invites);

/**
 * @swagger
 * /invites:
 *   post:
 *     summary: Create an invite
 *     tags: [Invites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string }
 *               expires_at: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Invite created and sent
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', ADMIN, create_invite_ctrl);

/**
 * @swagger
 * /invites/{id}:
 *   get:
 *     summary: Get invite by ID
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invite object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', ADMIN, get_invite_by_id);

/**
 * @swagger
 * /invites/{id}:
 *   put:
 *     summary: Update an invite
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invite updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', ADMIN, update_invite_ctrl);

/**
 * @swagger
 * /invites/{id}:
 *   delete:
 *     summary: Delete an invite
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invite deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', ADMIN, delete_invite_ctrl);

/**
 * @swagger
 * /invites/{id}/accept:
 *   post:
 *     summary: Accept an invite
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invite accepted
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/accept', accept_invite_ctrl);

export default router;
