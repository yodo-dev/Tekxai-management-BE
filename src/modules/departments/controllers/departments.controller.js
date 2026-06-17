import {
  create_department,
  create_division,
  delete_department,
  get_department,
  list_departments,
  list_divisions,
  update_department,
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

export async function get_divs(req, res, next) {
  try { return res.json({ success: true, payload: await list_divisions(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_div(req, res, next) {
  try { return res.status(201).json({ success: true, payload: await create_division(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}
