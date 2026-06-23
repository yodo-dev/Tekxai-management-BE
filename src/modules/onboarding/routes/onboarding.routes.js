import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { accept_offer, complete_task, create_candidate, create_offer, create_task, get_candidate, get_tasks, list_candidates, reject_offer, send_offer } from '../controllers/onboarding.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/candidates',         HR,   list_candidates);
router.post('/candidates',        HR, create_candidate);
router.get('/candidates/:id',     HR,   get_candidate);
router.post('/offers',            HR, create_offer);
router.post('/offers/:id/send',   HR, send_offer);
router.post('/offers/:id/accept', accept_offer);
router.post('/offers/:id/reject', reject_offer);
router.get('/tasks/:userId',      HR,   get_tasks);
router.post('/tasks',             HR, create_task);
router.patch('/tasks/:id/complete', complete_task);

export default router;
