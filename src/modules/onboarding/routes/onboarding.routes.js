import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { accept_offer, complete_task, create_candidate, create_offer, create_task, get_candidate, get_tasks, list_candidates, reject_offer, send_offer } from '../controllers/onboarding.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/candidates',         HR, can('hr.onboarding.view'),   list_candidates);
router.post('/candidates',        HR, can('hr.onboarding.manage'), create_candidate);
router.get('/candidates/:id',     HR, can('hr.onboarding.view'),   get_candidate);
router.post('/offers',            HR, can('hr.onboarding.manage'), create_offer);
router.post('/offers/:id/send',   HR, can('hr.onboarding.manage'), send_offer);
router.post('/offers/:id/accept', accept_offer);
router.post('/offers/:id/reject', reject_offer);
router.get('/tasks/:userId',      HR, can('hr.onboarding.view'),   get_tasks);
router.post('/tasks',             HR, can('hr.onboarding.manage'), create_task);
router.patch('/tasks/:id/complete', complete_task);

export default router;
