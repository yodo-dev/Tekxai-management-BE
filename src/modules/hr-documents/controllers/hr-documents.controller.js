import * as service from '../services/hr-documents.service.js';
import { PLACEHOLDER_REGISTRY, DOCUMENT_STATUSES, SIGNER_ROLES } from '../constants/placeholders.js';
import { validate_category, validate_type, validate_template, validate_generate } from '../validators/hr-documents.validation.js';

// ── Placeholder registry (Phase 1 deliverable — FE reads this to render a
// token picker instead of hardcoding the list client-side) ─────────────────

export async function get_placeholder_registry(req, res, next) {
  try {
    return res.json({ success: true, payload: { placeholders: PLACEHOLDER_REGISTRY.map(({ token, group, label }) => ({ token, group, label })), statuses: DOCUMENT_STATUSES, signer_roles: SIGNER_ROLES } });
  } catch (e) { return next(e); }
}

// ── Categories ────────────────────────────────────────────────────────────

export async function list_categories_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.list_categories({ include_inactive: req.query.include_inactive === 'true' }) });
  } catch (e) { return next(e); }
}

export async function create_category_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_category(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await service.create_category(req.body) });
  } catch (e) { return next(e); }
}

export async function update_category_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.update_category(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

// ── Document Types ────────────────────────────────────────────────────────

export async function list_types_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.list_types({ category_id: req.query.category_id, include_inactive: req.query.include_inactive === 'true' }) });
  } catch (e) { return next(e); }
}

export async function create_type_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_type(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await service.create_type(req.body) });
  } catch (e) { return next(e); }
}

export async function update_type_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.update_type(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

// ── Templates ─────────────────────────────────────────────────────────────

export async function list_templates_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.list_templates({ category_id: req.query.category_id, type_id: req.query.type_id, include_inactive: req.query.include_inactive === 'true' }) });
  } catch (e) { return next(e); }
}

export async function get_template_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.get_template(req.params.id) });
  } catch (e) { return next(e); }
}

export async function list_template_versions_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.list_template_versions(req.params.id) });
  } catch (e) { return next(e); }
}

export async function create_template_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_template(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await service.create_template({ ...req.body, created_by: req.user.id }) });
  } catch (e) { return next(e); }
}

export async function update_template_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await service.update_template(req.params.id, { ...req.body, created_by: req.user.id }) });
  } catch (e) { return next(e); }
}

// ── Preview / Render (Phase 2) ───────────────────────────────────────────

export async function preview_render_ctrl(req, res, next) {
  try {
    const { content, user_id } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'content is required' });
    return res.json({ success: true, payload: await service.preview_render(content, user_id) });
  } catch (e) { return next(e); }
}

// ── Documents ─────────────────────────────────────────────────────────────

const HR_LIST_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'];

export async function list_documents_ctrl(req, res, next) {
  try {
    const is_hr = (req.user.roles || []).some((r) => HR_LIST_ROLES.includes(r));
    const params = { ...req.query };
    if (!is_hr) params.user_id = req.user.id; // employee portal — forced to own documents regardless of query
    return res.json({ success: true, payload: await service.list_documents(params) });
  } catch (e) { return next(e); }
}

export async function get_document_ctrl(req, res, next) {
  try {
    const doc = await service.get_document(req.params.id);
    const is_hr = (req.user.roles || []).some((r) => HR_LIST_ROLES.includes(r));
    if (doc.user_id !== req.user.id && !is_hr) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this document' });
    }
    return res.json({ success: true, payload: doc });
  } catch (e) { return next(e); }
}

export async function generate_document_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_generate(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    const { document, unresolved } = await service.generate_document({ ...req.body, created_by: req.user.id });
    return res.status(201).json({ success: true, payload: document, meta: { unresolved_placeholders: unresolved } });
  } catch (e) { return next(e); }
}

export async function renew_document_ctrl(req, res, next) {
  try {
    const { document, unresolved } = await service.renew_document(req.params.id, req.body, req.user.id);
    return res.status(201).json({ success: true, payload: document, meta: { unresolved_placeholders: unresolved } });
  } catch (e) { return next(e); }
}

// ── Status workflow ────────────────────────────────────────────────────────

export async function send_document_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await service.send_document(req.params.id, req.user.id) }); }
  catch (e) { return next(e); }
}

// Not gated by can_or_role (employees must reach these for their own
// documents), so ownership is enforced here instead — the requesting user
// must either own the document or hold an HR-ish role.
async function assert_owns_or_hr(req, id) {
  const doc = await service.get_document(id);
  const is_hr = (req.user.roles || []).some((r) => HR_LIST_ROLES.includes(r));
  if (doc.user_id !== req.user.id && !is_hr) {
    const e = new Error('Not authorized to act on this document');
    e.status_code = 403;
    throw e;
  }
  return doc;
}

export async function view_document_ctrl(req, res, next) {
  try {
    await assert_owns_or_hr(req, req.params.id);
    return res.json({ success: true, payload: await service.mark_viewed(req.params.id) });
  } catch (e) { return next(e); }
}

export async function reject_document_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await service.reject_document(req.params.id, req.body?.reason) }); }
  catch (e) { return next(e); }
}

export async function cancel_document_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await service.cancel_document(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function archive_document_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await service.archive_document(req.params.id) }); }
  catch (e) { return next(e); }
}

// ── Signatures ────────────────────────────────────────────────────────────

export async function sign_document_ctrl(req, res, next) {
  try {
    const { signer_role, signature_data, required_roles } = req.body;
    if (!signer_role || !SIGNER_ROLES.includes(signer_role)) {
      return res.status(400).json({ success: false, message: `signer_role must be one of: ${SIGNER_ROLES.join(', ')}` });
    }
    // EMPLOYEE-role signature must be the document's own employee; HR/COMPANY
    // signatures require an HR-ish role. Either way, ownership/role check
    // happens before the mutation.
    if (signer_role === 'EMPLOYEE') {
      await assert_owns_or_hr(req, req.params.id);
    } else {
      const is_hr = (req.user.roles || []).some((r) => HR_LIST_ROLES.includes(r));
      if (!is_hr) {
        const e = new Error(`Only HR can sign as ${signer_role}`);
        e.status_code = 403;
        throw e;
      }
    }
    const payload = await service.sign_document(req.params.id, {
      signer_role, signature_data, required_roles,
      signer_user_id: req.user.id,
      ip_address: req.ip,
    });
    return res.json({ success: true, payload });
  } catch (e) { return next(e); }
}
