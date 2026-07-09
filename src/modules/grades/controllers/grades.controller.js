import {
  create_grade,
  delete_grade,
  get_grade,
  list_grades,
  update_grade,
} from '../services/grades.service.js';
import { validate_grade } from '../validators/grades.validation.js';

export async function get_grades_ctrl(req, res, next) {
  try {
    const { search } = req.query;
    return res.json({ success: true, payload: await list_grades({ search }) });
  } catch (e) { return next(e); }
}

export async function get_grade_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_grade(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_grade_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_grade(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_grade(req.body) });
  } catch (e) { return next(e); }
}

export async function update_grade_ctrl(req, res, next) {
  try {
    if (req.body?.name !== undefined || req.body?.level !== undefined) {
      const existing = await get_grade(req.params.id);
      const merged = { name: existing.name, level: existing.level, ...req.body };
      const { valid, message } = validate_grade(merged);
      if (!valid) return res.status(400).json({ success: false, message });
    }
    return res.json({ success: true, payload: await update_grade(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_grade_ctrl(req, res, next) {
  try {
    await delete_grade(req.params.id);
    return res.json({ success: true, message: 'Grade deleted' });
  } catch (e) { return next(e); }
}
