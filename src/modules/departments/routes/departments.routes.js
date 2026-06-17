import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_dept, create_div, delete_dept, get_dept, get_departments, get_divs, update_dept } from '../controllers/departments.controller.js';

const router = Router();
router.use(authenticate);
const ADMIN = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/', get_departments);
router.post('/', ADMIN, create_dept);
router.get('/:id', get_dept);
router.put('/:id', ADMIN, update_dept);
router.delete('/:id', ADMIN, delete_dept);
router.get('/:id/divisions', get_divs);
router.post('/:id/divisions', ADMIN, create_div);
export default router;
