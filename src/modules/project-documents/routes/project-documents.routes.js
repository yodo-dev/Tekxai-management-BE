import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { admin_or_project_owner } from '../../devops-access/controllers/devops-access.controller.js';
import {
  create_doc_ctrl, delete_doc_ctrl, get_doc_types_ctrl, list_docs_ctrl,
} from '../controllers/project-documents.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/types', get_doc_types_ctrl);
router.get('/', list_docs_ctrl);
// Only an admin or the project's own owner/leader may add or remove documents
// on a project — matches the scoping already used for devops-access/extension review.
router.post('/', admin_or_project_owner, create_doc_ctrl);
router.delete('/:docId', admin_or_project_owner, delete_doc_ctrl);

export default router;
