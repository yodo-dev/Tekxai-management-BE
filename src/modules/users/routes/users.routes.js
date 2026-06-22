import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { create_user_ctrl, delete_user_ctrl, get_user_by_id, get_users, update_my_profile, get_my_activity, update_user_ctrl } from '../controllers/users.controller.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);

const ADMIN = authorize('ADMIN', 'SUPER_ADMIN');
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/roles', ADMIN, async (_req, res, next) => {
  try {
    const roles = await prisma.roles.findMany({ orderBy: { level: 'desc' } });
    return res.json({ success: true, payload: roles });
  } catch (e) { return next(e); }
});

router.get('/me/activity', get_my_activity);
router.get('/me',          (req, res, next) => { req.params.id = req.user.id; return get_user_by_id(req, res, next); });
router.patch('/me',        update_my_profile);
router.get('/',            ADMIN_HR, can('erp.users.view'),   get_users);
router.get('/:id',         get_user_by_id);
router.post('/',           ADMIN, can('erp.users.create'),    create_user_ctrl);
router.put('/:id',         ADMIN, can('erp.users.edit'),      update_user_ctrl);
router.delete('/:id',      ADMIN, can('erp.users.delete'),    delete_user_ctrl);

export default router;
