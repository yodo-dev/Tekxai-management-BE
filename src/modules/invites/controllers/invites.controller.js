import {
  accept_invite_for_user,
  delete_existing_invite,
  get_invite,
  list_invites,
  preview_token,
  redeem_invite,
  send_invite,
  update_existing_invite,
} from '../services/invites.service.js';

export async function get_invites(req, res, next) {
  try {
    const result = await list_invites(req.query);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_invite_by_id(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_invite(req.params.id) });
  } catch (e) { return next(e); }
}

export async function preview_invite_token(req, res, next) {
  try {
    return res.json({ success: true, payload: await preview_token(req.params.token) });
  } catch (e) { return next(e); }
}

export async function create_invite_ctrl(req, res, next) {
  try {
    const invite = await send_invite({ ...req.body, invited_by: req.user.id });
    return res.status(201).json({ success: true, payload: invite });
  } catch (e) { return next(e); }
}

export async function update_invite_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await update_existing_invite(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_invite_ctrl(req, res, next) {
  try {
    await delete_existing_invite(req.params.id);
    return res.json({ success: true, message: 'Invite deleted' });
  } catch (e) { return next(e); }
}

export async function redeem_invite_ctrl(req, res, next) {
  try {
    const result = await redeem_invite(req.body);
    return res.json({ success: true, ...result });
  } catch (e) { return next(e); }
}

export async function accept_invite_ctrl(req, res, next) {
  try {
    await accept_invite_for_user(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Invite accepted' });
  } catch (e) { return next(e); }
}
