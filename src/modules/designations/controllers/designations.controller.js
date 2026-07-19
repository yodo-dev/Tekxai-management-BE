import {
  bulk_delete_designations,
  create_designation,
  delete_designation,
  get_designation,
  list_designations,
  update_designation,
} from '../services/designations.service.js';
import { validate_designation } from '../validators/designations.validation.js';

export async function get_designations_ctrl(req, res, next) {
  try {
    const { search, department_id } = req.query;
    return res.json({ success: true, payload: await list_designations({ search, department_id }) });
  } catch (e) { return next(e); }
}

export async function get_designation_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_designation(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_designation_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_designation(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_designation(req.body) });
  } catch (e) { return next(e); }
}

export async function update_designation_ctrl(req, res, next) {
  try {
    if (req.body?.name !== undefined) {
      const { valid, message } = validate_designation(req.body);
      if (!valid) return res.status(400).json({ success: false, message });
    }
    return res.json({ success: true, payload: await update_designation(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_designation_ctrl(req, res, next) {
  try {
    await delete_designation(req.params.id);
    return res.json({ success: true, message: 'Designation deleted' });
  } catch (e) { return next(e); }
}

export async function bulk_delete_designations_ctrl(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const results = await bulk_delete_designations(ids);
    const succeeded = results.filter(r => r.success).length;
    return res.json({ success: true, message: `${succeeded} of ${ids.length} designation(s) deleted`, payload: { results } });
  } catch (e) { return next(e); }
}
