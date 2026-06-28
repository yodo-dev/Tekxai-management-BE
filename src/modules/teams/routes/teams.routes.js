import { Router } from 'express';
import team_members_router from './team_members.routes.js';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_team_ctrl, delete_team_ctrl, get_team_by_id, get_teams, update_team_ctrl, add_member_ctrl, remove_member_ctrl, list_members_ctrl } from '../controllers/teams.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN    = can_or_role('erp.teams.create',  'ADMIN', 'SUPER_ADMIN');
const MANAGER  = can_or_role('erp.teams.edit',    'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

router.get('/',     get_teams);
router.get('/:id',  get_team_by_id);
router.post('/',    ADMIN, create_team_ctrl);
router.put('/:id',  ADMIN,   update_team_ctrl);
router.delete('/:id', ADMIN, delete_team_ctrl);
router.use('/:teamId/members', team_members_router);
router.get('/:id/members',         list_members_ctrl);
router.post('/:id/members',        MANAGER, add_member_ctrl);
router.delete('/:id/members/:userId', MANAGER, remove_member_ctrl);

export default router;
