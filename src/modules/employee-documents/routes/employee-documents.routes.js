import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_doc_ctrl, delete_doc_ctrl, get_doc_types_ctrl, get_docs_ctrl, update_doc_ctrl } from '../controllers/employee-documents.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

router.get('/types', get_doc_types_ctrl);
router.get('/:userId',            ADMIN_HR, get_docs_ctrl);
router.post('/:userId',           ADMIN_HR, create_doc_ctrl);
router.put('/:userId/:docId',     ADMIN_HR, update_doc_ctrl);
router.delete('/:userId/:docId',  ADMIN_HR, delete_doc_ctrl);

export default router;
