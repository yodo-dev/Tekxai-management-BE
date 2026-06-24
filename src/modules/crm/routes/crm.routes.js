import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_client, get_client, grant_project_access, list_client_projects, list_clients } from '../controllers/crm.controller.js';
import { crm_dashboard_ctrl, team_hierarchy_ctrl, assign_supervisor_ctrl } from '../controllers/crm-dashboard.controller.js';
import {
  leads_list_ctrl, lead_stage_ctrl, pipeline_meta_ctrl,
  handoffs_list_ctrl, handoff_create_ctrl, handoff_update_ctrl,
  invoices_list_ctrl, invoice_create_ctrl, invoice_update_ctrl,
} from '../controllers/crm-leads.controller.js';

const router = Router();
router.use(authenticate);
const M   = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING');
const MA  = authorize('ADMIN', 'SUPER_ADMIN');
const MH  = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');

// Dashboard & hierarchy
router.get('/dashboard',                  M,    crm_dashboard_ctrl);
router.get('/hierarchy',                  M,    team_hierarchy_ctrl);
router.patch('/users/:userId/supervisor', MA,   assign_supervisor_ctrl);

// Pipeline / unified leads
router.get('/pipeline/meta',              M,    pipeline_meta_ctrl);
router.get('/leads',                      M,    leads_list_ctrl);
router.patch('/leads/:source/:id/stage',  M,    lead_stage_ctrl);

// Handoffs (CRM → ERP)
router.get('/handoffs',                   MH,   handoffs_list_ctrl);
router.post('/handoffs',                  M,    handoff_create_ctrl);
router.put('/handoffs/:id',               MA,   handoff_update_ctrl);

// Invoices — admin/manager only
router.get('/invoices',                   MA,   invoices_list_ctrl);
router.post('/invoices',                  MA,   invoice_create_ctrl);
router.put('/invoices/:id',               MA,   invoice_update_ctrl);

// Client accounts — admin/manager only (must be last to avoid conflicting :id param)
router.get('/',                           MA,   list_clients);
router.post('/',                          MA,   create_client);
router.get('/:id',                        MA,   get_client);
router.post('/:id/access',                MA,   grant_project_access);
router.get('/:id/projects',               MA,   list_client_projects);

export default router;
