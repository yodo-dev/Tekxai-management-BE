import {
  add_entry,
  approve_edit_request,
  approve_time_off,
  edit_entry,
  get_all_requests,
  get_my_requests,
  get_policies,
  get_weekly_timesheet,
  reject_edit_request,
  reject_time_off,
  remove_entry,
  request_edit,
  request_time_off,
} from '../services/timesheets.service.js';

const is_admin = (req) => req.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));

export async function weekly(req, res, next) {
  try {
    const admin = is_admin(req);
    const result = await get_weekly_timesheet(req.user.id, {
      date: req.query.date,
      is_admin: admin,
      search: req.query.search,
    });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function requests(req, res, next) {
  try {
    const result = is_admin(req) ? await get_all_requests() : await get_my_requests(req.user.id);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function my_requests(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_my_requests(req.user.id) });
  } catch (e) { return next(e); }
}

export async function create_entry(req, res, next) {
  try {
    const entry = await add_entry(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: entry });
  } catch (e) { return next(e); }
}

export async function update_entry(req, res, next) {
  try {
    const entry = await edit_entry(req.params.id, req.user.id, req.body);
    return res.json({ success: true, payload: entry });
  } catch (e) { return next(e); }
}

export async function delete_entry(req, res, next) {
  try {
    await remove_entry(req.params.id, req.user.id, is_admin(req));
    return res.json({ success: true, message: 'Entry deleted' });
  } catch (e) { return next(e); }
}

export async function request_entry_edit(req, res, next) {
  try {
    const result = await request_edit(req.params.id, req.user.id, req.body);
    return res.status(201).json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function approve_edit(req, res, next) {
  try {
    await approve_edit_request(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Approved' });
  } catch (e) { return next(e); }
}

export async function reject_edit(req, res, next) {
  try {
    await reject_edit_request(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Rejected' });
  } catch (e) { return next(e); }
}

export async function get_time_off_policies(req, res, next) {
  try {
    const policies = await get_policies();
    return res.json({ success: true, payload: { records: policies } });
  } catch (e) { return next(e); }
}

export async function time_off_request(req, res, next) {
  try {
    const body = req.body instanceof FormData ? Object.fromEntries(req.body) : req.body;
    const result = await request_time_off(req.user.id, body);
    return res.status(201).json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function approve_time_off_ctrl(req, res, next) {
  try {
    await approve_time_off(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, message: 'Approved' });
  } catch (e) { return next(e); }
}

export async function reject_time_off_ctrl(req, res, next) {
  try {
    await reject_time_off(req.params.id, req.user.id, req.body.comment);
    return res.json({ success: true, message: 'Rejected' });
  } catch (e) { return next(e); }
}
