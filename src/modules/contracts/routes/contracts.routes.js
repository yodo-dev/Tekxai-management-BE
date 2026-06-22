import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { create_contract, create_template, get_contract, list_contracts, list_templates, sign_contract, update_contract, update_template } from '../controllers/contracts.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/templates',     HR, list_templates);
router.post('/templates',    HR, can('hr.contracts.create'), create_template);
router.put('/templates/:id', HR, can('hr.contracts.edit'),   update_template);
router.get('/',              list_contracts);
router.post('/',             HR, can('hr.contracts.create'), create_contract);
router.get('/:id',           get_contract);
router.put('/:id',           HR, can('hr.contracts.edit'),   update_contract);
router.post('/:id/sign',     sign_contract);

export default router;
