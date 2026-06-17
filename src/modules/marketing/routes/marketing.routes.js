import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_deal_ctrl,
  get_deals,
  get_salary_builder_ctrl,
  get_salary_history,
  publish_salary_ctrl,
  upsert_salary_ctrl,
} from '../controllers/marketing.controller.js';

const router = Router();
router.use(authenticate);
const MKT = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');

router.get('/deals', MKT, get_deals);
router.post('/deals', MKT, create_deal_ctrl);
router.get('/salary-builder', MKT, get_salary_builder_ctrl);
router.post('/salary-builder', MKT, upsert_salary_ctrl);
router.post('/salary-builder/:user_id/:period/publish', authorize('ADMIN', 'SUPER_ADMIN'), publish_salary_ctrl);
router.get('/salary-history', MKT, get_salary_history);

export default router;
