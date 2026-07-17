import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { admin_or_project_owner } from '../../devops-access/controllers/devops-access.controller.js';
import { create_link_ctrl, delete_link_ctrl, list_links } from '../controllers/tracking-links.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', list_links);
// Only an admin or the project's own owner/leader may add or remove tracking
// links — previously any authenticated user could do this on any project.
router.post('/', admin_or_project_owner, create_link_ctrl);
router.delete('/:linkId', admin_or_project_owner, delete_link_ctrl);

export default router;
