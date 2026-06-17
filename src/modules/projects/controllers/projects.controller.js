import {
  create_new_project,
  delete_existing_project,
  get_project,
  get_saved,
  list_projects,
  toggle_save_project,
  update_existing_project,
} from '../services/projects.service.js';

export async function get_projects(req, res, next) {
  try {
    const { search, page, limit, status } = req.query;
    const result = await list_projects({ search, page: +page || 1, limit: +limit || 20, status }, req.user.id);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_project_by_id(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_project(req.params.id, req.user.id) });
  } catch (e) { return next(e); }
}

export async function create_project_ctrl(req, res, next) {
  try {
    const data = { ...req.body, owner_id: req.body.owner_id || req.user.id };
    return res.status(201).json({ success: true, payload: await create_new_project(data) });
  } catch (e) { return next(e); }
}

export async function update_project_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await update_existing_project(req.params.id, req.body, req.user.id) });
  } catch (e) { return next(e); }
}

export async function delete_project_ctrl(req, res, next) {
  try {
    await delete_existing_project(req.params.id);
    return res.json({ success: true, message: 'Project deleted' });
  } catch (e) { return next(e); }
}

export async function get_saved_projects(req, res, next) {
  try {
    const projects = await get_saved(req.user.id, req.query);
    return res.json({ success: true, payload: { records: projects } });
  } catch (e) { return next(e); }
}

export async function save_project_ctrl(req, res, next) {
  try {
    await toggle_save_project(req.user.id, req.params.id, 'save');
    return res.json({ success: true, message: 'Project saved' });
  } catch (e) { return next(e); }
}

export async function unsave_project_ctrl(req, res, next) {
  try {
    await toggle_save_project(req.user.id, req.params.id, 'unsave');
    return res.json({ success: true, message: 'Project unsaved' });
  } catch (e) { return next(e); }
}
