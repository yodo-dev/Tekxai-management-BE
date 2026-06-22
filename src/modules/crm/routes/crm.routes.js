import { Router } from 'express';
import { authenticate, authorize, can } from '../../../shared/middleware/authenticate.js';
import { create_client, get_client, grant_project_access, list_client_projects, list_clients } from '../controllers/crm.controller.js';
import { crm_dashboard_ctrl, team_hierarchy_ctrl, assign_supervisor_ctrl } from '../controllers/crm-dashboard.controller.js';
import {
  leads_list_ctrl, lead_stage_ctrl, pipeline_meta_ctrl,
  handoffs_list_ctrl, handoff_create_ctrl, handoff_update_ctrl,
  invoices_list_ctrl, invoice_create_ctrl, invoice_update_ctrl,
} from '../controllers/crm-leads.controller.js';

const router = Router();
router.use(authenticate);
const M  = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING');
const MA = authorize('ADMIN', 'SUPER_ADMIN');
const MH = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');

// Dashboard & hierarchy
router.get('/dashboard',                  M, can('crm.dashboard.view'),    crm_dashboard_ctrl);
router.get('/hierarchy',                  M, team_hierarchy_ctrl);
router.patch('/users/:userId/supervisor', MA, assign_supervisor_ctrl);

// Pipeline / unified leads
router.get('/pipeline/meta',              M, can('crm.pipeline.view'),   pipeline_meta_ctrl);
router.get('/leads',                      M, can('crm.pipeline.view'),   leads_list_ctrl);
router.patch('/leads/:source/:id/stage',  M, can('crm.pipeline.edit'),   lead_stage_ctrl);

// Handoffs (CRM → ERP)
router.get('/handoffs',                   MH, can('crm.handoffs.view'),   handoffs_list_ctrl);
router.post('/handoffs',                  M,  can('crm.handoffs.create'), handoff_create_ctrl);
router.put('/handoffs/:id',               MA, handoff_update_ctrl);

// Invoices
router.get('/invoices',                   M,  can('crm.invoices.view'),   invoices_list_ctrl);
router.post('/invoices',                  M,  can('crm.invoices.create'), invoice_create_ctrl);
router.put('/invoices/:id',               MA, can('crm.invoices.approve'),invoice_update_ctrl);

// Client accounts (must be last to avoid conflicting :id param)
router.get('/',                           M, list_clients);
router.post('/',                          M, create_client);
router.get('/:id',                        M, get_client);
router.post('/:id/access',                M, grant_project_access);
router.get('/:id/projects',               authenticate, list_client_projects);

export default router;
