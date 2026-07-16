// Pure validation / status-transition logic for the Meeting Management module.
// Kept dependency-free (no Prisma) so it can be unit-tested directly, mirroring
// tickets.validation.js's validate_ticket() pattern.

export const ROOM_STATUSES = ['ACTIVE', 'CLOSED', 'ARCHIVED'];
export const MEETING_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
export const AGENDA_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
export const ACTION_ITEM_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
export const ACTION_ITEM_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const ATTACHABLE_TYPES = ['ROOM', 'MEETING', 'AGENDA_ITEM', 'ACTION_ITEM'];

export function validate_meeting_room(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Room name is required' };
  if (body.status !== undefined && !ROOM_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ROOM_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

export function validate_meeting(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Meeting title is required' };
  if (!body?.scheduled_at) return { valid: false, message: 'scheduled_at is required' };
  if (Number.isNaN(new Date(body.scheduled_at).getTime())) {
    return { valid: false, message: 'scheduled_at must be a valid date' };
  }
  if (body.status !== undefined && !MEETING_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${MEETING_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

export function validate_agenda_item(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Agenda item title is required' };
  if (body.status !== undefined && !AGENDA_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${AGENDA_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

// Simple forward-only transition: PENDING -> IN_PROGRESS -> COMPLETED, but also
// allows any status to jump straight to COMPLETED (an item can be resolved
// directly) and does not allow moving backward out of COMPLETED — completed
// agenda items remain visible in history and are never un-completed.
export function validate_agenda_transition(current, next) {
  if (!AGENDA_STATUSES.includes(next)) return { valid: false, message: `status must be one of ${AGENDA_STATUSES.join(', ')}` };
  if (current === 'COMPLETED' && next !== 'COMPLETED') {
    return { valid: false, message: 'A completed agenda item cannot be reopened' };
  }
  return { valid: true };
}

export function validate_action_item(body) {
  if (!body?.title?.trim()) return { valid: false, message: 'Action item title is required' };
  if (!body?.assignee_id) return { valid: false, message: 'assignee_id is required' };
  if (body.priority !== undefined && !ACTION_ITEM_PRIORITIES.includes(body.priority)) {
    return { valid: false, message: `priority must be one of ${ACTION_ITEM_PRIORITIES.join(', ')}` };
  }
  if (body.status !== undefined && !ACTION_ITEM_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ACTION_ITEM_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

export function validate_attachment(body) {
  if (!body?.attachable_type || !ATTACHABLE_TYPES.includes(body.attachable_type)) {
    return { valid: false, message: `attachable_type must be one of ${ATTACHABLE_TYPES.join(', ')}` };
  }
  if (!body?.attachable_id) return { valid: false, message: 'attachable_id is required' };
  if (!body?.file_url?.trim()) return { valid: false, message: 'file_url is required' };
  if (!body?.file_name?.trim()) return { valid: false, message: 'file_name is required' };
  return { valid: true };
}

// Action item due-date classification — pure function, unit-tested, used by
// both the dashboard aggregation and the scheduler reminder job so the two
// never disagree on what counts as "overdue" vs "due today".
export function classify_due_date(due_date, status, now = new Date()) {
  if (!due_date || status === 'COMPLETED') return 'NONE';
  const due = new Date(due_date);
  const today_start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today_end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due < today_start) return 'OVERDUE';
  if (due >= today_start && due < today_end) return 'DUE_TODAY';
  return 'UPCOMING';
}

// Sort helper for a chronological timeline view (oldest first) — the frontend
// timeline component and the backend both use this so ordering is consistent.
export function sort_timeline_events(events) {
  return [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}
