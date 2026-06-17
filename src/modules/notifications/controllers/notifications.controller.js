import { delete_notification, get_notifications, mark_all_read, mark_read } from '../services/notifications.service.js';

export async function list(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_notifications(req.user.id, req.query) });
  } catch (e) { return next(e); }
}

export async function mark_one(req, res, next) {
  try {
    await mark_read(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Marked as read' });
  } catch (e) { return next(e); }
}

export async function mark_all(req, res, next) {
  try {
    await mark_all_read(req.user.id);
    return res.json({ success: true, message: 'All marked as read' });
  } catch (e) { return next(e); }
}

export async function remove(req, res, next) {
  try {
    await delete_notification(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return next(e); }
}
