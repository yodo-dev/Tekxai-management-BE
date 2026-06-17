import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_team_ctrl, delete_team_ctrl, get_team_by_id, get_teams, update_team_ctrl } from '../controllers/teams.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', get_teams);
router.get('/:id', get_team_by_id);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), create_team_ctrl);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), update_team_ctrl);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), delete_team_ctrl);
export default router;
