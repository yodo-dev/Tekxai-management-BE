import { change_password, get_settings, update_preferences } from '../services/settings.service.js';

export async function get_my_settings(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_settings(req.user.id) });
  } catch (e) { return next(e); }
}

export async function update_prefs(req, res, next) {
  try {
    const s = await update_preferences(req.user.id, req.body);
    return res.json({ success: true, payload: s });
  } catch (e) { return next(e); }
}

export async function update_password(req, res, next) {
  try {
    const result = await change_password(req.user.id, {
      old_password: req.body.old_password,
      new_password: req.body.new_password,
    });
    return res.json({ success: true, message: result.message });
  } catch (e) { return next(e); }
}
