import {
  DOC_TYPES, create_project_doc, delete_project_doc, find_project_doc, list_project_docs,
} from '../repositories/project-documents.repository.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export async function get_doc_types_ctrl(_req, res, next) {
  try {
    return ok(res, DOC_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })));
  } catch (err) { next(err); }
}

export async function list_docs_ctrl(req, res, next) {
  try {
    const records = await list_project_docs(req.params.projectId);
    return ok(res, { records, total: records.length });
  } catch (err) { next(err); }
}

export async function create_doc_ctrl(req, res, next) {
  try {
    if (!req.body?.title?.trim()) return fail(res, 'title is required');
    if (!req.body?.file_url && !req.body?.file_key) return fail(res, 'file_url or file_key is required (upload via /storage/upload first)');
    const doc = await create_project_doc(req.params.projectId, req.body, req.user.id);
    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.projectId,
      description: `Uploaded document "${doc.title}" (${doc.document_type})`,
    }).catch(() => {});
    return ok(res, doc, 'Document added', 201);
  } catch (err) { next(err); }
}

export async function delete_doc_ctrl(req, res, next) {
  try {
    const existing = await find_project_doc(req.params.docId, req.params.projectId);
    if (!existing) return fail(res, 'Document not found', 404);
    await delete_project_doc(req.params.docId, req.params.projectId);
    return ok(res, null, 'Document deleted');
  } catch (err) { next(err); }
}
