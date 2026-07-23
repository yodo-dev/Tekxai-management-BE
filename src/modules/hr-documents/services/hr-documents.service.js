import * as repo from '../repositories/hr-documents.repository.js';
import { render_document_for_user } from './placeholder-engine.service.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import { render_document_pdf, store_document_pdf } from './pdf.service.js';
import { get_presigned_download_url } from '../../storage/storage.service.js';
import { get_hr_profile, upsert_hr_profile } from '../../hr-profile/services/hr-profile.service.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

// ── Categories / Types / Templates ───────────────────────────────────────────

export const list_categories = repo.list_categories;
export const create_category = repo.create_category;
export const update_category = repo.update_category;
export const list_types = repo.list_types;
export const create_type = repo.create_type;
export const update_type = repo.update_type;
export const list_templates = repo.list_templates;
export const get_template = repo.get_template;
export const list_template_versions = repo.list_template_versions;
export const create_template = repo.create_template;
export const update_template = repo.update_template;
export const duplicate_template = repo.duplicate_template;
export const delete_template = repo.delete_template;

// ── Preview / Render (no persistence — used by the New Document screen) ────

export async function preview_render(content, user_id) {
  if (!user_id) throw app_error('user_id is required to preview a render', 422);
  const { rendered, unresolved } = await render_document_for_user(content, user_id);
  return { rendered, unresolved };
}

// ── Generation (Phase 2) ─────────────────────────────────────────────────────

// Generates a new, immutable hr_documents row. If template_id is given, its
// CURRENT version is rendered and pinned (template_version_id) — later edits
// to that template never retroactively affect this document. If no
// template_id is given, `raw_content` is rendered as free text instead (same
// placeholder engine, so ad hoc one-off letters still get real substitution).
export async function generate_document({
  user_id, category_id, type_id, template_id, raw_content, title, valid_from, valid_until,
  previous_document_id, created_by,
}) {
  if (!user_id) throw app_error('user_id is required', 422);
  if (!category_id || !type_id) throw app_error('category_id and type_id are required', 422);

  let content_source;
  let template_version_id = null;
  let requires_approval = false;
  if (template_id) {
    const template = await repo.get_template(template_id);
    if (!template.current_version) throw app_error('Template has no content to render', 422);
    content_source = template.current_version.content;
    template_version_id = template.current_version.id;
    requires_approval = !!template.requires_approval;
  } else {
    if (!raw_content) throw app_error('Either template_id or raw_content is required', 422);
    content_source = raw_content;
  }

  const { rendered, unresolved } = await render_document_for_user(content_source, user_id);

  const document = await repo.create_document({
    user_id, category_id, type_id,
    template_id: template_id || null,
    template_version_id,
    title: title || 'Untitled Document',
    content: rendered,
    status: requires_approval ? 'DRAFT' : 'GENERATED',
    valid_from: valid_from ? new Date(valid_from) : null,
    valid_until: valid_until ? new Date(valid_until) : null,
    previous_document_id: previous_document_id || null,
    created_by,
  });

  return { document, unresolved };
}

// ── Renewal (Phase 3) ─────────────────────────────────────────────────────────

// A renewal is just generate_document() again, chained via
// previous_document_id — no separate table, no separate code path. Defaults
// category/type/template/user from the document being renewed so the caller
// only has to override what's actually changing (e.g. new valid_until).
export async function renew_document(previous_document_id, overrides = {}, created_by) {
  const previous = await repo.get_document(previous_document_id);
  return generate_document({
    user_id: overrides.user_id || previous.user_id,
    category_id: overrides.category_id || previous.category_id,
    type_id: overrides.type_id || previous.type_id,
    template_id: overrides.template_id ?? previous.template_id ?? undefined,
    raw_content: overrides.template_id ? undefined : (overrides.raw_content || previous.content),
    title: overrides.title || `${previous.title} (Renewal)`,
    valid_from: overrides.valid_from,
    valid_until: overrides.valid_until,
    previous_document_id,
    created_by,
  });
}

// ── Status workflow (Phase 3) ────────────────────────────────────────────────

const TRANSITIONS = {
  DRAFT: ['GENERATED', 'CANCELLED'],
  GENERATED: ['SENT', 'CANCELLED'],
  SENT: ['VIEWED', 'SIGNED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  VIEWED: ['SIGNED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  SIGNED: ['ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  EXPIRED: ['ARCHIVED'],
  ARCHIVED: [],
};

function assert_transition(from, to) {
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw app_error(`Cannot transition document from ${from} to ${to}`, 409);
  }
}

// Single-step approval gate: flips a template-flagged DRAFT to GENERATED so
// it becomes sendable. Rejecting a DRAFT reuses cancel_document (DRAFT ->
// CANCELLED is already a legal transition) — no separate reject path needed.
export async function approve_draft_document(id, actor_id) {
  const doc = await repo.get_document(id);
  assert_transition(doc.status, 'GENERATED');
  const updated = await repo.update_document_status(id, { status: 'GENERATED' });
  if (updated.created_by) {
    create_notification({
      user_id: updated.created_by,
      title: 'Document Approved',
      message: `"${updated.title}" has been approved and is ready to send.`,
      type: 'HR_DOCUMENT',
    }).catch(() => null);
  }
  return updated;
}

export async function send_document(id, actor_id) {
  const doc = await repo.get_document(id);
  assert_transition(doc.status, 'SENT');
  const updated = await repo.update_document_status(id, { status: 'SENT', sent_at: new Date() });
  create_notification({
    user_id: doc.user_id,
    title: 'New Document Ready',
    message: `A new document "${doc.title}" has been sent to you for review.`,
    type: 'HR_DOCUMENT',
  }).catch(() => null);
  return updated;
}

// Called when the employee (portal) opens a SENT document — idempotent and
// silent for any other status, since "viewing" a DRAFT/SIGNED doc isn't a
// meaningful transition.
export async function mark_viewed(id) {
  const doc = await repo.get_document(id);
  if (doc.status !== 'SENT') return doc;
  return repo.update_document_status(id, { status: 'VIEWED', viewed_at: new Date() });
}

export async function reject_document(id, reason) {
  const doc = await repo.get_document(id);
  assert_transition(doc.status, 'REJECTED');
  return repo.update_document_status(id, { status: 'REJECTED', rejected_at: new Date(), rejection_reason: reason || null });
}

export async function cancel_document(id) {
  const doc = await repo.get_document(id);
  assert_transition(doc.status, 'CANCELLED');
  return repo.update_document_status(id, { status: 'CANCELLED', cancelled_at: new Date() });
}

export async function archive_document(id) {
  const doc = await repo.get_document(id);
  assert_transition(doc.status, 'ARCHIVED');
  return repo.update_document_status(id, { status: 'ARCHIVED', archived_at: new Date() });
}

// Scheduler-facing: flips any SENT/VIEWED document past its valid_until into
// EXPIRED. Returns the count flipped, for logging.
export async function expire_overdue_documents() {
  const overdue = await repo.list_documents({ status: 'SENT', limit: 500 });
  const overdue_viewed = await repo.list_documents({ status: 'VIEWED', limit: 500 });
  const candidates = [...overdue.records, ...overdue_viewed.records].filter(
    (d) => d.valid_until && new Date(d.valid_until) < new Date()
  );
  for (const d of candidates) {
    await repo.update_document_status(d.id, { status: 'EXPIRED' });
  }
  return candidates.length;
}

// ── Signatures (Phase 3) ──────────────────────────────────────────────────────

// One row per (document, signer_role) — created on first sign, updated if
// re-signed. When ALL required roles for a document have signed, the
// document itself transitions to SIGNED.
export async function sign_document(id, { signer_role, signer_user_id, signature_data, ip_address, required_roles, cnic }) {
  const doc = await repo.get_document(id);
  if (!['SENT', 'VIEWED'].includes(doc.status)) {
    throw app_error(`Document must be SENT or VIEWED to sign (currently ${doc.status})`, 409);
  }
  if (!signature_data) throw app_error('signature_data is required', 422);

  // Employee identity confirmation: signing on your own behalf requires a
  // CNIC on file — captured here (once) rather than via a separate profile
  // edit, since this is the one moment identity actually matters for this
  // flow. Reuses the same upsert_hr_profile write path as the HR-facing
  // profile editor, so employee_profiles.cnic never has two writers.
  if (signer_role === 'EMPLOYEE') {
    const profile = await get_hr_profile(signer_user_id);
    if (!profile?.cnic && !cnic) {
      const e = app_error('CNIC confirmation is required before signing', 422);
      e.code = 'CNIC_REQUIRED';
      throw e;
    }
    if (!profile?.cnic && cnic) {
      await upsert_hr_profile(signer_user_id, { cnic }, signer_user_id);
    }
  }

  let signature = await repo.find_signature(id, signer_role);
  if (!signature) {
    signature = await repo.create_signature({ document_id: id, signer_role, signer_user_id });
  }
  signature = await repo.mark_signature_signed(signature.id, { signature_data, ip_address });

  const roles_needed = required_roles && required_roles.length ? required_roles : ['EMPLOYEE'];
  const refreshed = await repo.get_document(id);
  const all_signed = roles_needed.every((role) =>
    refreshed.signatures.some((s) => s.signer_role === role && s.signed_at)
  );

  if (all_signed) {
    const signed_doc = await repo.update_document_status(id, { status: 'SIGNED' });
    if (signer_role === 'EMPLOYEE' && signed_doc.created_by) {
      create_notification({
        user_id: signed_doc.created_by,
        title: 'Document Signed',
        message: `${signed_doc.user?.first_name || 'The employee'} signed "${signed_doc.title}".`,
        type: 'HR_DOCUMENT',
      }).catch(() => null);
    }
    return signed_doc;
  }
  return refreshed;
}

export const get_document = repo.get_document;
export const list_documents = repo.list_documents;
export const set_document_file_key = repo.set_document_file_key;

// ── PDF (Phase 3) ─────────────────────────────────────────────────────────

// PDF is generated once, lazily, from the document's immutable `content` and
// cached via `file_key` — subsequent calls just re-presign the same object
// instead of re-rendering, since content never changes after creation.
export async function get_document_pdf_url(id) {
  const doc = await repo.get_document(id);
  let file_key = doc.file_key;
  if (!file_key) {
    const buffer = await render_document_pdf(doc);
    file_key = await store_document_pdf(doc.id, buffer);
    await repo.set_document_file_key(doc.id, file_key);
  }
  const url = await get_presigned_download_url(file_key);
  return { url, file_key };
}
