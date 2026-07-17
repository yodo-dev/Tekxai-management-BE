import prisma from '../../../shared/database/client.js';
import { log_activity, find_activity_logs } from '../../activity-logs/repositories/activity.repository.js';
import { create_notification } from '../../notifications/services/notifications.service.js';
import { validate_agenda_transition, classify_due_date } from '../validators/meetings.validation.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const USER_SELECT = { id: true, first_name: true, last_name: true, email: true, avatar: true };

function log(user_id, action, entity_type, entity_id, description) {
  log_activity({ user_id, action, entity_type, entity_id, description }).catch(() => null);
}

function notify(user_id, title, message, type = 'MEETING') {
  if (!user_id) return;
  create_notification({ user_id, title, message, type }).catch(() => null);
}

// ─── Meeting Rooms ────────────────────────────────────────────────────────────

const ROOM_INCLUDE = {
  owner: { select: USER_SELECT },
  department: { select: { id: true, name: true } },
  members: { include: { user: { select: USER_SELECT } } },
  _count: { select: { meetings: true, agenda_items: true } },
};

export async function list_meeting_rooms({
  status, department_id, owner_id, participant_id, search, page = 1, limit = 20,
} = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  if (status) where.status = status;
  if (department_id) where.department_id = department_id;
  if (owner_id) where.owner_id = owner_id;
  if (participant_id) where.members = { some: { user_id: participant_id } };

  const and = [];
  if (search?.trim()) {
    const q = search.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { agenda_items: { some: { title: { contains: q, mode: 'insensitive' } } } },
        { meetings: { some: { title: { contains: q, mode: 'insensitive' } } } },
        { meetings: { some: { decisions: { some: { decision_text: { contains: q, mode: 'insensitive' } } } } } },
        { meetings: { some: { action_items: { some: { title: { contains: q, mode: 'insensitive' } } } } } },
        { members: { some: { user: { OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
        ] } } } },
      ],
    });
  }
  if (and.length) where.AND = and;

  const [total, records] = await Promise.all([
    prisma.meeting_rooms.count({ where }),
    prisma.meeting_rooms.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: ROOM_INCLUDE }),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_meeting_room(id) {
  const room = await prisma.meeting_rooms.findFirst({
    where: { id, deleted_at: null },
    include: {
      ...ROOM_INCLUDE,
      agenda_items: { orderBy: { created_at: 'desc' } },
      meetings: { orderBy: { scheduled_at: 'desc' }, include: { organizer: { select: USER_SELECT } } },
    },
  });
  if (!room) throw app_error('Meeting room not found', 404);
  return room;
}

export async function create_meeting_room({ name, description, department_id, owner_id, member_ids = [] }) {
  const room = await prisma.meeting_rooms.create({
    data: {
      name: name.trim(),
      description: description || null,
      department_id: department_id || null,
      owner_id,
      members: {
        create: [
          { user_id: owner_id, role: 'OWNER' },
          ...member_ids.filter((id) => id !== owner_id).map((user_id) => ({ user_id, role: 'MEMBER' })),
        ],
      },
    },
    include: ROOM_INCLUDE,
  });
  log(owner_id, 'CREATE', 'meeting_room', room.id, `Created meeting room "${room.name}"`);
  for (const m of room.members) if (m.user_id !== owner_id) notify(m.user_id, 'Added to meeting room', `You were added to "${room.name}"`);
  return room;
}

export async function update_meeting_room(id, actor_id, { name, description, department_id }) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  if (room.status !== 'ACTIVE') throw app_error('Only active rooms can be edited', 400);

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description;
  if (department_id !== undefined) data.department_id = department_id || null;

  const updated = await prisma.meeting_rooms.update({ where: { id }, data, include: ROOM_INCLUDE });
  log(actor_id, 'UPDATE', 'meeting_room', id, `Updated meeting room "${updated.name}"`);
  return updated;
}

export async function set_meeting_room_status(id, actor_id, status) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  const updated = await prisma.meeting_rooms.update({ where: { id }, data: { status }, include: ROOM_INCLUDE });
  log(actor_id, 'UPDATE', 'meeting_room', id, `Room "${updated.name}" set to ${status}`);
  return updated;
}

export async function soft_delete_meeting_room(id, actor_id) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  await prisma.meeting_rooms.update({ where: { id }, data: { deleted_at: new Date(), status: 'ARCHIVED' } });
  log(actor_id, 'DELETE', 'meeting_room', id, `Archived/deleted room "${room.name}"`);
  return { success: true };
}

export async function add_room_member(room_id, actor_id, { user_id, role = 'MEMBER' }) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id: room_id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  const member = await prisma.meeting_room_members.upsert({
    where: { room_id_user_id: { room_id, user_id } },
    update: { role },
    create: { room_id, user_id, role },
    include: { user: { select: USER_SELECT } },
  });
  log(actor_id, 'UPDATE', 'meeting_room', room_id, `Added member to room "${room.name}"`);
  notify(user_id, 'Added to meeting room', `You were added to "${room.name}"`);
  return member;
}

export async function remove_room_member(room_id, actor_id, user_id) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id: room_id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  await prisma.meeting_room_members.deleteMany({ where: { room_id, user_id } });
  log(actor_id, 'UPDATE', 'meeting_room', room_id, `Removed member from room "${room.name}"`);
  return { success: true };
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

const MEETING_INCLUDE = {
  organizer: { select: USER_SELECT },
  room: { select: { id: true, name: true, status: true } },
  participants: { include: { user: { select: USER_SELECT } } },
  previous_meeting: { select: { id: true, title: true, scheduled_at: true } },
  _count: { select: { notes: true, decisions: true, action_items: true, follow_ups: true } },
};

export async function list_meetings({
  room_id, status, organizer_id, participant_id, project_id, from, to, search, page = 1, limit = 20,
} = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  if (room_id) where.room_id = room_id;
  if (status) where.status = status;
  if (organizer_id) where.organizer_id = organizer_id;
  if (project_id) where.project_id = project_id;
  if (participant_id) where.participants = { some: { user_id: participant_id } };
  if (from || to) {
    where.scheduled_at = {};
    if (from) where.scheduled_at.gte = new Date(from);
    if (to) where.scheduled_at.lte = new Date(to);
  }
  if (search?.trim()) {
    where.title = { contains: search.trim(), mode: 'insensitive' };
  }

  const [total, records] = await Promise.all([
    prisma.meetings.count({ where }),
    prisma.meetings.findMany({ where, skip, take: limit, orderBy: { scheduled_at: 'desc' }, include: MEETING_INCLUDE }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_meeting(id) {
  const meeting = await prisma.meetings.findFirst({
    where: { id, deleted_at: null },
    include: {
      ...MEETING_INCLUDE,
      notes: { orderBy: { created_at: 'desc' }, include: { author: { select: USER_SELECT } } },
      decisions: { orderBy: { created_at: 'desc' }, include: { decider: { select: USER_SELECT } } },
      action_items: { orderBy: { created_at: 'desc' }, include: { assignee: { select: USER_SELECT } } },
      agenda_items: { orderBy: { created_at: 'desc' } },
      follow_ups: { select: { id: true, title: true, scheduled_at: true, status: true } },
    },
  });
  if (!meeting) throw app_error('Meeting not found', 404);
  return meeting;
}

export async function create_meeting({
  room_id, title, scheduled_at, organizer_id, previous_meeting_id, project_id, participant_ids = [],
}) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id: room_id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  if (room.status !== 'ACTIVE') throw app_error('Cannot schedule a meeting in a non-active room', 400);

  if (previous_meeting_id) {
    const prev = await prisma.meetings.findFirst({ where: { id: previous_meeting_id, deleted_at: null } });
    if (!prev) throw app_error('previous_meeting_id not found', 404);
    if (prev.room_id !== room_id) throw app_error('Follow-up meeting must be in the same room', 400);
  }

  if (project_id) {
    const project = await prisma.projects.findFirst({ where: { id: project_id, deleted_at: null } });
    if (!project) throw app_error('project_id not found', 404);
  }

  const meeting = await prisma.meetings.create({
    data: {
      room_id, title: title.trim(), scheduled_at: new Date(scheduled_at), organizer_id,
      previous_meeting_id: previous_meeting_id || null,
      project_id: project_id || null,
      participants: {
        create: [
          { user_id: organizer_id },
          ...participant_ids.filter((id) => id !== organizer_id).map((user_id) => ({ user_id })),
        ],
      },
    },
    include: MEETING_INCLUDE,
  });

  log(organizer_id, 'CREATE', 'meeting_room', room_id, `Meeting Created: "${meeting.title}"`);
  log(organizer_id, 'CREATE', 'meeting', meeting.id, `Meeting Created: "${meeting.title}"`);
  for (const p of meeting.participants) {
    if (p.user_id !== organizer_id) notify(p.user_id, 'New meeting scheduled', `${meeting.title} — ${new Date(meeting.scheduled_at).toLocaleString()}`);
  }
  return meeting;
}

export async function update_meeting(id, actor_id, { title, scheduled_at, participant_ids }) {
  const meeting = await prisma.meetings.findFirst({ where: { id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  if (meeting.status !== 'SCHEDULED') throw app_error('Only scheduled meetings can be edited', 400);

  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (scheduled_at !== undefined) data.scheduled_at = new Date(scheduled_at);

  const updated = await prisma.meetings.update({ where: { id }, data, include: MEETING_INCLUDE });

  if (Array.isArray(participant_ids)) {
    await prisma.meeting_participants.deleteMany({ where: { meeting_id: id } });
    await prisma.meeting_participants.createMany({
      data: participant_ids.map((user_id) => ({ meeting_id: id, user_id })),
      skipDuplicates: true,
    });
  }

  log(actor_id, 'UPDATE', 'meeting', id, `Meeting Updated: "${updated.title}"`);
  const participants = await prisma.meeting_participants.findMany({ where: { meeting_id: id } });
  for (const p of participants) notify(p.user_id, 'Meeting updated', `${updated.title} was updated`);
  return updated;
}

export async function close_meeting(id, actor_id) {
  const meeting = await prisma.meetings.findFirst({ where: { id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  const updated = await prisma.meetings.update({
    where: { id }, data: { status: 'COMPLETED', closed_at: new Date() }, include: MEETING_INCLUDE,
  });
  log(actor_id, 'UPDATE', 'meeting', id, `Meeting Closed: "${updated.title}"`);
  return updated;
}

export async function cancel_meeting(id, actor_id) {
  const meeting = await prisma.meetings.findFirst({ where: { id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  const updated = await prisma.meetings.update({ where: { id }, data: { status: 'CANCELLED' }, include: MEETING_INCLUDE });
  log(actor_id, 'UPDATE', 'meeting', id, `Meeting Cancelled: "${updated.title}"`);
  const participants = await prisma.meeting_participants.findMany({ where: { meeting_id: id } });
  for (const p of participants) notify(p.user_id, 'Meeting cancelled', `${updated.title} has been cancelled`);
  return updated;
}

export async function add_participant(meeting_id, actor_id, user_id) {
  const meeting = await prisma.meetings.findFirst({ where: { id: meeting_id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  const participant = await prisma.meeting_participants.upsert({
    where: { meeting_id_user_id: { meeting_id, user_id } },
    update: {}, create: { meeting_id, user_id },
    include: { user: { select: USER_SELECT } },
  });
  log(actor_id, 'UPDATE', 'meeting', meeting_id, `Added participant to "${meeting.title}"`);
  notify(user_id, 'Added to meeting', meeting.title);
  return participant;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function add_meeting_note(meeting_id, author_id, content) {
  const meeting = await prisma.meetings.findFirst({ where: { id: meeting_id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  if (!content?.trim()) throw app_error('Note content is required', 400);
  const note = await prisma.meeting_notes.create({
    data: { meeting_id, author_id, content: content.trim() },
    include: { author: { select: USER_SELECT } },
  });
  log(author_id, 'CREATE', 'meeting', meeting_id, `Note added to "${meeting.title}"`);
  return note;
}

export async function update_meeting_note(note_id, actor_id, content) {
  const note = await prisma.meeting_notes.findUnique({ where: { id: note_id } });
  if (!note) throw app_error('Note not found', 404);
  const updated = await prisma.meeting_notes.update({
    where: { id: note_id }, data: { content: content.trim() }, include: { author: { select: USER_SELECT } },
  });
  log(actor_id, 'UPDATE', 'meeting', note.meeting_id, 'Meeting note updated');
  return updated;
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export async function add_meeting_decision(meeting_id, decided_by, decision_text) {
  const meeting = await prisma.meetings.findFirst({ where: { id: meeting_id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  if (!decision_text?.trim()) throw app_error('decision_text is required', 400);
  const decision = await prisma.meeting_decisions.create({
    data: { meeting_id, decided_by, decision_text: decision_text.trim() },
    include: { decider: { select: USER_SELECT } },
  });
  log(decided_by, 'CREATE', 'meeting', meeting_id, `Decision Added: "${decision.decision_text.slice(0, 80)}"`);
  return decision;
}

// ─── Agenda Items ─────────────────────────────────────────────────────────────

export async function list_agenda_items(room_id, { status, meeting_id } = {}) {
  const where = { room_id };
  if (status) where.status = status;
  if (meeting_id) where.meeting_id = meeting_id;
  return prisma.meeting_agenda_items.findMany({ where, orderBy: { created_at: 'desc' } });
}

export async function create_agenda_item(room_id, actor_id, { title, description }) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id: room_id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  const item = await prisma.meeting_agenda_items.create({
    data: { room_id, title: title.trim(), description: description || null },
  });
  log(actor_id, 'CREATE', 'meeting_room', room_id, `Agenda item added: "${item.title}"`);
  return item;
}

export async function update_agenda_item(id, actor_id, { title, description, status, meeting_id }) {
  const item = await prisma.meeting_agenda_items.findUnique({ where: { id } });
  if (!item) throw app_error('Agenda item not found', 404);

  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description;
  if (meeting_id !== undefined) data.meeting_id = meeting_id || null;
  if (status !== undefined && status !== item.status) {
    const { valid, message } = validate_agenda_transition(item.status, status);
    if (!valid) throw app_error(message, 400);
    data.status = status;
  }

  const updated = await prisma.meeting_agenda_items.update({ where: { id }, data });
  log(actor_id, 'UPDATE', 'meeting_room', item.room_id, `Agenda Updated: "${updated.title}"${data.status ? ` -> ${data.status}` : ''}`);
  return updated;
}

export async function complete_agenda_item(id, actor_id, meeting_id) {
  return update_agenda_item(id, actor_id, { status: 'COMPLETED', meeting_id });
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export async function list_action_items({ meeting_id, room_id, assignee_id, status, priority, due_from, due_to, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (meeting_id) where.meeting_id = meeting_id;
  if (room_id) where.meeting = { room_id };
  if (assignee_id) where.assignee_id = assignee_id;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (due_from || due_to) {
    where.due_date = {};
    if (due_from) where.due_date.gte = new Date(due_from);
    if (due_to) where.due_date.lte = new Date(due_to);
  }

  const [total, records] = await Promise.all([
    prisma.meeting_action_items.count({ where }),
    prisma.meeting_action_items.findMany({
      where, skip, take: limit, orderBy: { due_date: 'asc' },
      include: { assignee: { select: USER_SELECT }, meeting: { select: { id: true, title: true, room_id: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_action_item(meeting_id, actor_id, { title, assignee_id, due_date, priority, notes }) {
  const meeting = await prisma.meetings.findFirst({ where: { id: meeting_id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  const item = await prisma.meeting_action_items.create({
    data: {
      meeting_id, title: title.trim(), assignee_id, due_date: due_date ? new Date(due_date) : null,
      priority: priority || 'MEDIUM', notes: notes || null,
    },
    include: { assignee: { select: USER_SELECT } },
  });
  log(actor_id, 'CREATE', 'meeting', meeting_id, `Action item created: "${item.title}"`);
  notify(assignee_id, 'Action item assigned to you', `${item.title} (from meeting "${meeting.title}")`, 'ACTION_ITEM');
  return item;
}

export async function update_action_item(id, actor_id, { title, assignee_id, due_date, priority, status, notes }) {
  const item = await prisma.meeting_action_items.findUnique({ where: { id } });
  if (!item) throw app_error('Action item not found', 404);

  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (assignee_id !== undefined && assignee_id !== item.assignee_id) data.assignee_id = assignee_id;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
  if (priority !== undefined) data.priority = priority;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.meeting_action_items.update({ where: { id }, data, include: { assignee: { select: USER_SELECT } } });

  if (data.assignee_id) notify(data.assignee_id, 'Action item assigned to you', updated.title, 'ACTION_ITEM');
  if (data.status === 'COMPLETED' && item.status !== 'COMPLETED') {
    log(actor_id, 'UPDATE', 'meeting', item.meeting_id, `Task (Action Item) Completed: "${updated.title}"`);
  } else if (Object.keys(data).length) {
    log(actor_id, 'UPDATE', 'meeting', item.meeting_id, `Action item updated: "${updated.title}"`);
  }
  return updated;
}

export async function complete_action_item(id, actor_id) {
  return update_action_item(id, actor_id, { status: 'COMPLETED' });
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function add_attachment(actor_id, { attachable_type, attachable_id, file_url, file_name }) {
  const attachment = await prisma.meeting_attachments.create({
    data: { attachable_type, attachable_id, file_url, file_name, uploaded_by: actor_id },
  });
  const entity_type = attachable_type === 'MEETING' ? 'meeting' : 'meeting_room';
  log(actor_id, 'CREATE', entity_type, attachable_id, `Attachment added: "${file_name}"`);
  return attachment;
}

export async function list_attachments(attachable_type, attachable_id) {
  return prisma.meeting_attachments.findMany({
    where: { attachable_type, attachable_id },
    orderBy: { created_at: 'desc' },
    include: { uploader: { select: USER_SELECT } },
  });
}

// ─── Timeline (reuses activity_logs — no dedicated events table) ─────────────

export async function get_meeting_room_timeline(room_id, { page = 1, limit = 50 } = {}) {
  const room = await prisma.meeting_rooms.findFirst({ where: { id: room_id, deleted_at: null } });
  if (!room) throw app_error('Meeting room not found', 404);
  return find_activity_logs({ entity_type: 'meeting_room', entity_id: room_id, page, limit });
}

export async function get_meeting_timeline(meeting_id, { page = 1, limit = 50 } = {}) {
  const meeting = await prisma.meetings.findFirst({ where: { id: meeting_id, deleted_at: null } });
  if (!meeting) throw app_error('Meeting not found', 404);
  return find_activity_logs({ entity_type: 'meeting', entity_id: meeting_id, page, limit });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function get_dashboard({ upcoming_limit = 5 } = {}) {
  const now = new Date();
  const [active_rooms, upcoming_meetings, action_items_open, pending_agenda_items, completed_meetings] = await Promise.all([
    prisma.meeting_rooms.count({ where: { deleted_at: null, status: 'ACTIVE' } }),
    prisma.meetings.findMany({
      where: { deleted_at: null, status: 'SCHEDULED', scheduled_at: { gte: now } },
      orderBy: { scheduled_at: 'asc' }, take: +upcoming_limit || 5,
      include: { room: { select: { id: true, name: true } }, organizer: { select: USER_SELECT } },
    }),
    prisma.meeting_action_items.findMany({
      where: { status: { not: 'COMPLETED' }, due_date: { not: null } },
      select: { due_date: true, status: true },
    }),
    prisma.meeting_agenda_items.count({ where: { status: 'PENDING' } }),
    prisma.meetings.count({ where: { deleted_at: null, status: 'COMPLETED' } }),
  ]);

  const overdue_action_items = action_items_open.filter((a) => classify_due_date(a.due_date, a.status, now) === 'OVERDUE').length;

  return {
    active_meeting_rooms: active_rooms,
    upcoming_meetings,
    overdue_action_items,
    pending_agenda_items,
    completed_meetings,
  };
}
