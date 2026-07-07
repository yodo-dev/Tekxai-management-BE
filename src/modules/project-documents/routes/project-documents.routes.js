import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import {
  create_doc_ctrl, delete_doc_ctrl, get_doc_types_ctrl, list_docs_ctrl,
} from '../controllers/project-documents.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/types', get_doc_types_ctrl);
router.get('/', list_docs_ctrl);
router.post('/', create_doc_ctrl);
router.delete('/:docId', delete_doc_ctrl);

export default router;
