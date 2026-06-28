import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  get_definitions,
  get_matrix,
  get_my_permissions,
  get_role,
  update_role,
  get_user_permissions_ctrl,
  set_user_permission_ctrl,
  delete_user_permission_ctrl,
  delete_all_user_permissions_ctrl,
} from '../controllers/permissions.controller.js';

const router = Router();
router.use(authenticate);

const SUPER_ADMIN_ONLY = authorize('SUPER_ADMIN');
const ADMIN_LEVEL      = authorize('SUPER_ADMIN', 'ADMIN');

/**
 * @swagger
 * /permissions/my-permissions:
 *   get:
 *     summary: Get current user's effective permissions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Permission list
 *       401:
 *         description: Unauthorized
 */
router.get('/my-permissions',    get_my_permissions);

/**
 * @swagger
 * /permissions/definitions:
 *   get:
 *     summary: List all permission definitions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Permission definitions
 *       401:
 *         description: Unauthorized
 */
router.get('/definitions',       ADMIN_LEVEL, get_definitions);

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get permissions matrix (all roles)
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Permissions matrix
 *       401:
 *         description: Unauthorized
 */
router.get('/',                  ADMIN_LEVEL, get_matrix);

/**
 * @swagger
 * /permissions/users/{userId}:
 *   get:
 *     summary: Get user-level permission overrides
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User permissions
 *       401:
 *         description: Unauthorized
 */
router.get('/users/:userId',     SUPER_ADMIN_ONLY, get_user_permissions_ctrl);

/**
 * @swagger
 * /permissions/users/{userId}:
 *   put:
 *     summary: Set user-level permission overrides
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Permission keys mapped to boolean allow/deny
 *     responses:
 *       200:
 *         description: Permissions updated
 *       401:
 *         description: Unauthorized
 */
router.put('/users/:userId',     SUPER_ADMIN_ONLY, set_user_permission_ctrl);

/**
 * @swagger
 * /permissions/users/{userId}/{permission}:
 *   delete:
 *     summary: Delete a specific user permission override
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: permission
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Permission deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/users/:userId/:permission', SUPER_ADMIN_ONLY, delete_user_permission_ctrl);

/**
 * @swagger
 * /permissions/users/{userId}:
 *   delete:
 *     summary: Delete all user permission overrides
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: All overrides deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/users/:userId',  SUPER_ADMIN_ONLY, delete_all_user_permissions_ctrl);

/**
 * @swagger
 * /permissions/{roleName}:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: roleName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Role permissions
 *       401:
 *         description: Unauthorized
 */
router.get('/:roleName',         ADMIN_LEVEL, get_role);

/**
 * @swagger
 * /permissions/{roleName}:
 *   put:
 *     summary: Update permissions for a role
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: roleName
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Permission keys mapped to boolean
 *     responses:
 *       200:
 *         description: Role permissions updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:roleName',         SUPER_ADMIN_ONLY, update_role);

export default router;
