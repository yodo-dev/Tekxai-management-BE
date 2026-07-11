import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import { create_client, get_client, grant_project_access, list_client_projects, list_clients } from '../controllers/crm.controller.js';
import { crm_dashboard_ctrl, post_sales_dashboard_ctrl, team_hierarchy_ctrl, assign_supervisor_ctrl } from '../controllers/crm-dashboard.controller.js';
import {
  leads_list_ctrl, lead_stage_ctrl, pipeline_meta_ctrl,
  handoffs_list_ctrl, handoff_create_ctrl, handoff_update_ctrl,
  invoices_list_ctrl, invoice_create_ctrl, invoice_update_ctrl,
} from '../controllers/crm-leads.controller.js';

const router = Router();
router.use(authenticate);
// NOTE: hierarchy, supervisor assignment, handoff/invoice edit, and client CRUD
// remain on authorize() — no matching crm.* permission key exists for those
// specific actions yet (see Sprint 1 Phase 5 Milestone 2 audit).
const M   = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING');
const MA  = authorize('ADMIN', 'SUPER_ADMIN');
const MH  = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');

const M_DASHBOARD_VIEW = can_or_role('crm.dashboard.view', 'ADMIN', 'SUPER_ADMIN', 'MARKETING');
const M_PIPELINE_VIEW  = can_or_role('crm.pipeline.view', 'ADMIN', 'SUPER_ADMIN', 'MARKETING');
const M_PIPELINE_EDIT  = can_or_role('crm.pipeline.edit', 'ADMIN', 'SUPER_ADMIN', 'MARKETING');
const M_HANDOFFS_CREATE = can_or_role('crm.handoffs.create', 'ADMIN', 'SUPER_ADMIN', 'MARKETING');
const MH_HANDOFFS_VIEW  = can_or_role('crm.handoffs.view', 'ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');
const MA_INVOICES_VIEW   = can_or_role('crm.invoices.view', 'ADMIN', 'SUPER_ADMIN');
const MA_INVOICES_CREATE = can_or_role('crm.invoices.create', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /crm/dashboard:
 *   get:
 *     summary: Get CRM dashboard stats
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: CRM dashboard data
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard',                  M_DASHBOARD_VIEW,    crm_dashboard_ctrl);

/**
 * @swagger
 * /crm/post-sales-dashboard:
 *   get:
 *     summary: Get the Post-Sales CRM dashboard (project delivery, client success, resourcing)
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Post-Sales CRM dashboard data
 *       401:
 *         description: Unauthorized
 */
router.get('/post-sales-dashboard',       M_DASHBOARD_VIEW,    post_sales_dashboard_ctrl);

/**
 * @swagger
 * /crm/hierarchy:
 *   get:
 *     summary: Get CRM team hierarchy
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Team hierarchy
 *       401:
 *         description: Unauthorized
 */
router.get('/hierarchy',                  M,    team_hierarchy_ctrl);

/**
 * @swagger
 * /crm/users/{userId}/supervisor:
 *   patch:
 *     summary: Assign supervisor to a user
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supervisor_id]
 *             properties:
 *               supervisor_id: { type: string }
 *     responses:
 *       200:
 *         description: Supervisor assigned
 *       401:
 *         description: Unauthorized
 */
router.patch('/users/:userId/supervisor', MA,   assign_supervisor_ctrl);

/**
 * @swagger
 * /crm/pipeline/meta:
 *   get:
 *     summary: Get pipeline metadata (stages, sources)
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Pipeline meta
 *       401:
 *         description: Unauthorized
 */
router.get('/pipeline/meta',              M_PIPELINE_VIEW,    pipeline_meta_ctrl);

/**
 * @swagger
 * /crm/leads:
 *   get:
 *     summary: List all leads (unified pipeline)
 *     tags: [CRM]
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema: { type: string }
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leads list
 *       401:
 *         description: Unauthorized
 */
router.get('/leads',                      M_PIPELINE_VIEW,    leads_list_ctrl);

/**
 * @swagger
 * /crm/leads/{source}/{id}/stage:
 *   patch:
 *     summary: Update lead stage
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stage]
 *             properties:
 *               stage: { type: string }
 *     responses:
 *       200:
 *         description: Stage updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/leads/:source/:id/stage',  M_PIPELINE_EDIT,    lead_stage_ctrl);

/**
 * @swagger
 * /crm/handoffs:
 *   get:
 *     summary: List CRM to ERP handoffs
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Handoffs list
 *       401:
 *         description: Unauthorized
 */
router.get('/handoffs',                   MH_HANDOFFS_VIEW,   handoffs_list_ctrl);

/**
 * @swagger
 * /crm/handoffs:
 *   post:
 *     summary: Create a handoff
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lead_id, source]
 *             properties:
 *               lead_id: { type: string }
 *               source: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Handoff created
 *       401:
 *         description: Unauthorized
 */
router.post('/handoffs',                  M_HANDOFFS_CREATE,    handoff_create_ctrl);

/**
 * @swagger
 * /crm/handoffs/{id}:
 *   put:
 *     summary: Update a handoff
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Handoff updated
 *       401:
 *         description: Unauthorized
 */
router.put('/handoffs/:id',               MA,   handoff_update_ctrl);

/**
 * @swagger
 * /crm/invoices:
 *   get:
 *     summary: List CRM invoices
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Invoices list
 *       401:
 *         description: Unauthorized
 */
router.get('/invoices',                   MA_INVOICES_VIEW,   invoices_list_ctrl);

/**
 * @swagger
 * /crm/invoices:
 *   post:
 *     summary: Create a CRM invoice
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_id, amount]
 *             properties:
 *               client_id: { type: string }
 *               amount: { type: number }
 *               due_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Invoice created
 *       401:
 *         description: Unauthorized
 */
router.post('/invoices',                  MA_INVOICES_CREATE,   invoice_create_ctrl);

/**
 * @swagger
 * /crm/invoices/{id}:
 *   put:
 *     summary: Update a CRM invoice
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invoice updated
 *       401:
 *         description: Unauthorized
 */
router.put('/invoices/:id',               MA,   invoice_update_ctrl);

/**
 * @swagger
 * /crm:
 *   get:
 *     summary: List CRM clients
 *     tags: [CRM]
 *     responses:
 *       200:
 *         description: Clients list
 *       401:
 *         description: Unauthorized
 */
router.get('/',                           MA,   list_clients);

/**
 * @swagger
 * /crm:
 *   post:
 *     summary: Create a CRM client
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               company: { type: string }
 *     responses:
 *       201:
 *         description: Client created
 *       401:
 *         description: Unauthorized
 */
router.post('/',                          MA,   create_client);

/**
 * @swagger
 * /crm/{id}:
 *   get:
 *     summary: Get CRM client by ID
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',                        MA,   get_client);

/**
 * @swagger
 * /crm/{id}/access:
 *   post:
 *     summary: Grant client access to a project
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id]
 *             properties:
 *               project_id: { type: string }
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/access',                MA,   grant_project_access);

/**
 * @swagger
 * /crm/{id}/projects:
 *   get:
 *     summary: List projects accessible to a CRM client
 *     tags: [CRM]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Projects list
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/projects',               MA,   list_client_projects);

export default router;
