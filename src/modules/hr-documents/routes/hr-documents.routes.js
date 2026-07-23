import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  get_placeholder_registry,
  list_categories_ctrl, create_category_ctrl, update_category_ctrl,
  list_types_ctrl, create_type_ctrl, update_type_ctrl,
  list_templates_ctrl, get_template_ctrl, list_template_versions_ctrl, create_template_ctrl, update_template_ctrl,
  duplicate_template_ctrl, delete_template_ctrl,
  preview_render_ctrl,
  list_documents_ctrl, get_document_ctrl, generate_document_ctrl, renew_document_ctrl,
  send_document_ctrl, view_document_ctrl, reject_document_ctrl, cancel_document_ctrl, archive_document_ctrl,
  approve_draft_document_ctrl,
  sign_document_ctrl, download_document_pdf_ctrl, download_document_docx_ctrl,
} from '../controllers/hr-documents.controller.js';

const router = Router();
router.use(authenticate);

const VIEW   = can_or_role('erp.hr_documents.view',   'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');
const MANAGE = can_or_role('erp.hr_documents.manage', 'ADMIN', 'SUPER_ADMIN', 'HR');

// Registry — read-only, any authenticated user (FE token pickers, employee portal)
router.get('/placeholders', get_placeholder_registry);

// Categories
router.get('/categories', VIEW, list_categories_ctrl);
router.post('/categories', MANAGE, create_category_ctrl);
router.put('/categories/:id', MANAGE, update_category_ctrl);

// Document Types
router.get('/types', VIEW, list_types_ctrl);
router.post('/types', MANAGE, create_type_ctrl);
router.put('/types/:id', MANAGE, update_type_ctrl);

// Templates
router.get('/templates', VIEW, list_templates_ctrl);
router.get('/templates/:id', VIEW, get_template_ctrl);
router.get('/templates/:id/versions', VIEW, list_template_versions_ctrl);
router.post('/templates', MANAGE, create_template_ctrl);
router.put('/templates/:id', MANAGE, update_template_ctrl);
router.post('/templates/:id/duplicate', MANAGE, duplicate_template_ctrl);
router.delete('/templates/:id', MANAGE, delete_template_ctrl);

// Preview render (no persistence)
router.post('/render/preview', VIEW, preview_render_ctrl);

// Documents — not VIEW-gated: employees must be able to see their own
// documents (employee portal). Self-scoping happens in the controller;
// HR-ish roles see everything, everyone else is forced to their own user_id.
router.get('/', list_documents_ctrl);
router.get('/:id', get_document_ctrl);
router.post('/generate', MANAGE, generate_document_ctrl);
router.post('/:id/renew', MANAGE, renew_document_ctrl);

// Status workflow
router.post('/:id/send', MANAGE, send_document_ctrl);
router.post('/:id/approve-draft', MANAGE, approve_draft_document_ctrl);
router.post('/:id/view', view_document_ctrl); // employee-portal — no MANAGE gate, self-scoped via document ownership check upstream
router.post('/:id/reject', MANAGE, reject_document_ctrl);
router.post('/:id/cancel', MANAGE, cancel_document_ctrl);
router.post('/:id/archive', MANAGE, archive_document_ctrl);

// Signatures — any authenticated user can sign (their own signature row);
// no MANAGE gate since employees must be able to sign their own documents.
router.post('/:id/sign', sign_document_ctrl);

// PDF download — employee portal + HR, ownership-checked in controller.
router.get('/:id/pdf', download_document_pdf_ctrl);
router.get('/:id/docx', download_document_docx_ctrl);

export default router;
