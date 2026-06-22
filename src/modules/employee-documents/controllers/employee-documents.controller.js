import { DOC_TYPES, list_employee_docs, create_employee_doc, update_employee_doc, delete_employee_doc } from '../services/employee-documents.service.js';

export async function get_docs_ctrl(req, res, next) {
  try {
    const docs = await list_employee_docs(req.params.userId);
    return res.json({ success: true, payload: docs });
  } catch (e) { return next(e); }
}

export async function get_doc_types_ctrl(_req, res, next) {
  try {
    const types = DOC_TYPES.map(v => ({ value: v, label: v.replace(/_/g, ' ') }));
    return res.json({ success: true, payload: types });
  } catch (e) { return next(e); }
}

export async function create_doc_ctrl(req, res, next) {
  try {
    const doc = await create_employee_doc(req.params.userId, req.body, req.user.id);
    return res.status(201).json({ success: true, payload: doc });
  } catch (e) { return next(e); }
}

export async function update_doc_ctrl(req, res, next) {
  try {
    await update_employee_doc(req.params.docId, req.params.userId, req.body);
    return res.json({ success: true, message: 'Document updated' });
  } catch (e) { return next(e); }
}

export async function delete_doc_ctrl(req, res, next) {
  try {
    await delete_employee_doc(req.params.docId, req.params.userId);
    return res.json({ success: true, message: 'Document deleted' });
  } catch (e) { return next(e); }
}
