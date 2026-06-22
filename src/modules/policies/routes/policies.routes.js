import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { acknowledge_policy, create_policy, get_policy, list_policies, my_acknowledgements, publish_policy, update_policy } from '../controllers/policies.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/',                  list_policies);
router.get('/my-acknowledgements', my_acknowledgements);
router.post('/',                 HR, can('hr.policies.manage'), create_policy);
router.get('/:id',               get_policy);
router.put('/:id',               HR, can('hr.policies.manage'), update_policy);
router.post('/:id/publish',      HR, can('hr.policies.manage'), publish_policy);
router.post('/:id/acknowledge',  acknowledge_policy);

export default router;
