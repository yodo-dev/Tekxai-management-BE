import {
  list_meeting_rooms, get_meeting_room, create_meeting_room, update_meeting_room,
  set_meeting_room_status, soft_delete_meeting_room, add_room_member, remove_room_member,
  list_meetings, get_meeting, create_meeting, update_meeting, close_meeting, cancel_meeting, add_participant,
  add_meeting_note, update_meeting_note, add_meeting_decision,
  list_agenda_items, create_agenda_item, update_agenda_item, complete_agenda_item,
  list_action_items, create_action_item, update_action_item, complete_action_item,
  add_attachment, list_attachments,
  get_meeting_room_timeline, get_meeting_timeline, get_dashboard,
} from '../services/meetings.service.js';
import {
  validate_meeting_room, validate_meeting, validate_agenda_item, validate_action_item, validate_attachment,
} from '../validators/meetings.validation.js';

function ok(res, payload, status = 200) { return res.status(status).json({ success: true, payload }); }
function fail(res, message, status = 400) { return res.status(status).json({ success: false, message }); }

// ── Rooms ──────────────────────────────────────────────────────────────────
export async function list_rooms_ctrl(req, res, next) {
  try {
    return ok(res, await list_meeting_rooms({ ...req.query }));
  } catch (e) { return next(e); }
}
export async function get_room_ctrl(req, res, next) {
  try { return ok(res, await get_meeting_room(req.params.id)); } catch (e) { return next(e); }
}
export async function create_room_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_meeting_room(req.body);
    if (!valid) return fail(res, message);
    return ok(res, await create_meeting_room({ ...req.body, owner_id: req.body.owner_id || req.user.id }), 201);
  } catch (e) { return next(e); }
}
export async function update_room_ctrl(req, res, next) {
  try { return ok(res, await update_meeting_room(req.params.id, req.user.id, req.body)); } catch (e) { return next(e); }
}
export async function set_room_status_ctrl(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'CLOSED', 'ARCHIVED'].includes(status)) return fail(res, 'Invalid status');
    return ok(res, await set_meeting_room_status(req.params.id, req.user.id, status));
  } catch (e) { return next(e); }
}
export async function delete_room_ctrl(req, res, next) {
  try { return ok(res, await soft_delete_meeting_room(req.params.id, req.user.id)); } catch (e) { return next(e); }
}
export async function add_room_member_ctrl(req, res, next) {
  try { return ok(res, await add_room_member(req.params.id, req.user.id, req.body), 201); } catch (e) { return next(e); }
}
export async function remove_room_member_ctrl(req, res, next) {
  try { return ok(res, await remove_room_member(req.params.id, req.user.id, req.params.userId)); } catch (e) { return next(e); }
}
export async function get_room_timeline_ctrl(req, res, next) {
  try { return ok(res, await get_meeting_room_timeline(req.params.id, req.query)); } catch (e) { return next(e); }
}

// ── Agenda (room-scoped) ────────────────────────────────────────────────────
export async function list_agenda_ctrl(req, res, next) {
  try { return ok(res, await list_agenda_items(req.params.id, req.query)); } catch (e) { return next(e); }
}
export async function create_agenda_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_agenda_item(req.body);
    if (!valid) return fail(res, message);
    return ok(res, await create_agenda_item(req.params.id, req.user.id, req.body), 201);
  } catch (e) { return next(e); }
}
export async function update_agenda_ctrl(req, res, next) {
  try { return ok(res, await update_agenda_item(req.params.agendaId, req.user.id, req.body)); } catch (e) { return next(e); }
}
export async function complete_agenda_ctrl(req, res, next) {
  try { return ok(res, await complete_agenda_item(req.params.agendaId, req.user.id, req.body?.meeting_id)); } catch (e) { return next(e); }
}

// ── Meetings ────────────────────────────────────────────────────────────────
export async function list_meetings_ctrl(req, res, next) {
  try { return ok(res, await list_meetings({ ...req.query })); } catch (e) { return next(e); }
}
export async function get_meeting_ctrl(req, res, next) {
  try { return ok(res, await get_meeting(req.params.id)); } catch (e) { return next(e); }
}
export async function create_meeting_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_meeting(req.body);
    if (!valid) return fail(res, message);
    return ok(res, await create_meeting({ ...req.body, organizer_id: req.body.organizer_id || req.user.id }), 201);
  } catch (e) { return next(e); }
}
export async function update_meeting_ctrl(req, res, next) {
  try { return ok(res, await update_meeting(req.params.id, req.user.id, req.body)); } catch (e) { return next(e); }
}
export async function close_meeting_ctrl(req, res, next) {
  try { return ok(res, await close_meeting(req.params.id, req.user.id)); } catch (e) { return next(e); }
}
export async function cancel_meeting_ctrl(req, res, next) {
  try { return ok(res, await cancel_meeting(req.params.id, req.user.id)); } catch (e) { return next(e); }
}
export async function add_participant_ctrl(req, res, next) {
  try { return ok(res, await add_participant(req.params.id, req.user.id, req.body.user_id), 201); } catch (e) { return next(e); }
}
export async function get_meeting_timeline_ctrl(req, res, next) {
  try { return ok(res, await get_meeting_timeline(req.params.id, req.query)); } catch (e) { return next(e); }
}

// ── Notes / Decisions ───────────────────────────────────────────────────────
export async function add_note_ctrl(req, res, next) {
  try { return ok(res, await add_meeting_note(req.params.id, req.user.id, req.body.content), 201); } catch (e) { return next(e); }
}
export async function update_note_ctrl(req, res, next) {
  try { return ok(res, await update_meeting_note(req.params.noteId, req.user.id, req.body.content)); } catch (e) { return next(e); }
}
export async function add_decision_ctrl(req, res, next) {
  try { return ok(res, await add_meeting_decision(req.params.id, req.user.id, req.body.decision_text), 201); } catch (e) { return next(e); }
}

// ── Action Items ─────────────────────────────────────────────────────────────
export async function list_action_items_ctrl(req, res, next) {
  try { return ok(res, await list_action_items({ ...req.query })); } catch (e) { return next(e); }
}
export async function create_action_item_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_action_item(req.body);
    if (!valid) return fail(res, message);
    return ok(res, await create_action_item(req.params.id, req.user.id, req.body), 201);
  } catch (e) { return next(e); }
}
export async function update_action_item_ctrl(req, res, next) {
  try { return ok(res, await update_action_item(req.params.actionId, req.user.id, req.body)); } catch (e) { return next(e); }
}
export async function complete_action_item_ctrl(req, res, next) {
  try { return ok(res, await complete_action_item(req.params.actionId, req.user.id)); } catch (e) { return next(e); }
}

// ── Attachments ──────────────────────────────────────────────────────────────
export async function add_attachment_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_attachment(req.body);
    if (!valid) return fail(res, message);
    return ok(res, await add_attachment(req.user.id, req.body), 201);
  } catch (e) { return next(e); }
}
export async function list_attachments_ctrl(req, res, next) {
  try { return ok(res, await list_attachments(req.query.attachable_type, req.query.attachable_id)); } catch (e) { return next(e); }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export async function dashboard_ctrl(req, res, next) {
  try { return ok(res, await get_dashboard(req.query)); } catch (e) { return next(e); }
}
