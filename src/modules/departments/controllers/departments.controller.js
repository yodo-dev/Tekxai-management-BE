import {
  bulk_delete_departments,
  bulk_delete_divisions,
  create_department,
  create_division,
  delete_department,
  delete_division,
  get_department,
  get_division,
  list_all_divisions,
  list_departments,
  list_divisions,
  update_department,
  update_division,
} from '../services/departments.service.js';

export async function get_departments(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_departments(req.query) });
  } catch (e) { return next(e); }
}

export async function get_dept(req, res, next) {
  try { return res.json({ success: true, payload: await get_department(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_dept(req, res, next) {
  try { return res.status(201).json({ success: true, payload: await create_department(req.body) }); }
  catch (e) { return next(e); }
}

export async function update_dept(req, res, next) {
  try { return res.json({ success: true, payload: await update_department(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

export async function delete_dept(req, res, next) {
  try { await delete_department(req.params.id); return res.json({ success: true, message: 'Deleted' }); }
  catch (e) { return next(e); }
}

export async function bulk_delete_depts(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const results = await bulk_delete_departments(ids);
    const succeeded = results.filter(r => r.success).length;
    return res.json({ success: true, message: `${succeeded} of ${ids.length} department(s) deleted`, payload: { results } });
  } catch (e) { return next(e); }
}

export async function get_divs(req, res, next) {
  try { return res.json({ success: true, payload: await list_divisions(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_div(req, res, next) {
  try { return res.status(201).json({ success: true, payload: await create_division(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

// Standalone division endpoints (mounted at /divisions) — same module/owner as departments.
export async function get_all_divs(req, res, next) {
  try {
    const { search, department_id } = req.query;
    return res.json({ success: true, payload: await list_all_divisions({ search, department_id }) });
  } catch (e) { return next(e); }
}

export async function get_div(req, res, next) {
  try { return res.json({ success: true, payload: await get_division(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function update_div(req, res, next) {
  try { return res.json({ success: true, payload: await update_division(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

export async function delete_div(req, res, next) {
  try {
    await delete_division(req.params.id);
    return res.json({ success: true, message: 'Division deleted' });
  } catch (e) { return next(e); }
}

export async function bulk_delete_divs(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const results = await bulk_delete_divisions(ids);
    const succeeded = results.filter(r => r.success).length;
    return res.json({ success: true, message: `${succeeded} of ${ids.length} division(s) deleted`, payload: { results } });
  } catch (e) { return next(e); }
}
