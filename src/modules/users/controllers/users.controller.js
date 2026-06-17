import { create_new_user, delete_user, get_user, list_users, update_existing_user } from '../services/users.service.js';

export async function get_users(req, res, next) {
  try {
    const { search, page, limit, role } = req.query;
    const result = await list_users({
      search,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      role,
    });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_user_by_id(req, res, next) {
  try {
    const user = await get_user(req.params.id);
    return res.json({ success: true, payload: user });
  } catch (e) { return next(e); }
}

export async function create_user_ctrl(req, res, next) {
  try {
    const user = await create_new_user(req.body);
    return res.status(201).json({ success: true, payload: user });
  } catch (e) { return next(e); }
}

export async function update_user_ctrl(req, res, next) {
  try {
    const user = await update_existing_user(req.params.id, req.body);
    return res.json({ success: true, payload: user });
  } catch (e) { return next(e); }
}

export async function delete_user_ctrl(req, res, next) {
  try {
    await delete_user(req.params.id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (e) { return next(e); }
}
