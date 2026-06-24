import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { upload_middleware, parse_file, get_internal_data, save_report, list_reports, get_report, delete_report } from '../controllers/reporting.controller.js';

const router = Router();
router.use(authenticate);
const SA = authorize('SUPER_ADMIN');

router.post('/parse', SA, upload_middleware.single('file'), parse_file);
router.get('/internal-data', SA, get_internal_data);
router.post('/', SA, save_report);
router.get('/', SA, list_reports);
router.get('/:id', SA, get_report);
router.delete('/:id', SA, delete_report);

export default router;
