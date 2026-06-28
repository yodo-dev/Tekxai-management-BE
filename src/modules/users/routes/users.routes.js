import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_user_ctrl, delete_user_ctrl, bulk_delete_users_ctrl, get_user_by_id, get_users, update_my_profile, get_my_activity, update_user_ctrl } from '../controllers/users.controller.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);

const ADMIN    = can_or_role('erp.users.delete', 'ADMIN', 'SUPER_ADMIN');
const ADMIN_HR = can_or_role('erp.users.view',   'ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /users/roles:
 *   get:
 *     summary: List all roles
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 */
router.get('/roles', ADMIN_HR, async (_req, res, next) => {
  try {
    const roles = await prisma.roles.findMany({ orderBy: { level: 'desc' } });
    return res.json({ success: true, payload: roles });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /users/me/activity:
 *   get:
 *     summary: Get current user's activity log
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Activity log entries
 *       401:
 *         description: Unauthorized
 */
router.get('/me/activity', get_my_activity);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Current user object
 *       401:
 *         description: Unauthorized
 */
router.get('/me',          (req, res, next) => { req.params.id = req.user.id; return get_user_by_id(req, res, next); });

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/me',        update_my_profile);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query
 *     responses:
 *       200:
 *         description: Paginated user list
 *       401:
 *         description: Unauthorized
 */
router.get('/',            ADMIN_HR, get_users);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',         get_user_by_id);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name]
 *             properties:
 *               email: { type: string, format: email }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               password: { type: string }
 *               role: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',           ADMIN_HR, create_user_ctrl);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               email: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: User updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',         ADMIN_HR, update_user_ctrl);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id',      ADMIN, delete_user_ctrl);

/**
 * @swagger
 * /users/bulk-delete:
 *   post:
 *     summary: Bulk delete users
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Users deleted
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk-delete', ADMIN, bulk_delete_users_ctrl);

export default router;
