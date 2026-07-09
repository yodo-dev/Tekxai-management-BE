import { create_new_user, delete_user, get_user, list_users, update_existing_user, change_user_designation } from '../services/users.service.js';

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
    const user = await create_new_user(req.body, req.user.id);
    return res.status(201).json({ success: true, payload: user });
  } catch (e) { return next(e); }
}

export async function update_user_ctrl(req, res, next) {
  try {
    const user = await update_existing_user(req.params.id, req.body, req.user.id);
    return res.json({ success: true, payload: user });
  } catch (e) { return next(e); }
}

export async function delete_user_ctrl(req, res, next) {
  try {
    await delete_user(req.params.id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (e) { return next(e); }
}

export async function bulk_delete_users_ctrl(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    await Promise.all(ids.map(id => delete_user(id)));
    return res.json({ success: true, message: `${ids.length} user(s) deleted` });
  } catch (e) { return next(e); }
}

// POST /users/:id/designation-change — Promotion / Transfer (direct HR/Admin
// action, single write path via record_designation_change()).
export async function change_user_designation_ctrl(req, res, next) {
  try {
    const result = await change_user_designation(req.params.id, req.body, req.user.id);
    return res.status(201).json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

// PATCH /user/me — employee updates own profile
export async function update_my_profile(req, res, next) {
  try {
    const allowed_fields = ['first_name', 'last_name', 'phone', 'designation', 'position'];
    const data = {};
    for (const f of allowed_fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    const user = await update_existing_user(req.user.id, data, req.user.id);
    return res.json({ success: true, message: 'Profile updated', payload: user });
  } catch (e) { return next(e); }
}

// GET /user/me/activity — employee activity summary
export async function get_my_activity(req, res, next) {
  try {
    const user = await get_user(req.user.id);
    return res.json({ success: true, payload: user });
  } catch (e) { return next(e); }
}
