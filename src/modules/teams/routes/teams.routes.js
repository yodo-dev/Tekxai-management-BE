import { Router } from 'express';
import team_members_router from './team_members.routes.js';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_team_ctrl, delete_team_ctrl, get_team_by_id, get_teams, update_team_ctrl, add_member_ctrl, remove_member_ctrl, list_members_ctrl } from '../controllers/teams.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN    = can_or_role('erp.teams.create',  'ADMIN', 'SUPER_ADMIN');
const MANAGER  = can_or_role('erp.teams.edit',    'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: List all teams
 *     tags: [Teams]
 *     responses:
 *       200:
 *         description: List of teams
 *       401:
 *         description: Unauthorized
 */
router.get('/',     get_teams);

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Team object
 *       404:
 *         description: Team not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',  get_team_by_id);

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
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
 *         description: Team created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',    ADMIN, create_team_ctrl);

/**
 * @swagger
 * /teams/{id}:
 *   put:
 *     summary: Update team by ID
 *     tags: [Teams]
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
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Team updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',  ADMIN,   update_team_ctrl);

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     summary: Delete team by ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Team deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', ADMIN, delete_team_ctrl);

router.use('/:teamId/members', team_members_router);

/**
 * @swagger
 * /teams/{id}/members:
 *   get:
 *     summary: List team members
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of members
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/members',         list_members_ctrl);

/**
 * @swagger
 * /teams/{id}/members:
 *   post:
 *     summary: Add member to team
 *     tags: [Teams]
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
 *               role: { type: string, example: MEMBER }
 *     responses:
 *       201:
 *         description: Member added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/members',        MANAGER, add_member_ctrl);

/**
 * @swagger
 * /teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/members/:userId', MANAGER, remove_member_ctrl);

export default router;
