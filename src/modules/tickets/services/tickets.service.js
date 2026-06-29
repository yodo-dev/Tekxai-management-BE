import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

async function next_ticket_number() {
  const last = await prisma.support_tickets.findFirst({ orderBy: { created_at: 'desc' } });
  if (!last) return 'TKT-1001';
  const num = parseInt(last.ticket_number.replace('TKT-', ''), 10) || 1000;
  return `TKT-${num + 1}`;
}

const USER_SELECT = { id: true, first_name: true, last_name: true, email: true, avatar: true };

async function get_replies_for(ticket_id) {
  return prisma.ticket_replies.findMany({
    take: 500,
    where: { ticket_id },
    include: { user: { select: USER_SELECT } },
    orderBy: { created_at: 'asc' },
  });
}

async function get_attachments_for(entity_id) {
  return prisma.file_uploads.findMany({
    take: 500,
    where: { entity_type: 'ticket', entity_id },
    select: { id: true, file_name: true, file_key: true, mime_type: true, file_size: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });
}

export async function list_tickets({ user_id, is_admin = false, status, priority, page = 1, limit = 20 } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [total, records] = await Promise.all([
    prisma.support_tickets.count({ where }),
    prisma.support_tickets.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
      include: { user: { select: USER_SELECT } },
    }),
  ]);

  return { records: records.map(normalize_ticket), total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_ticket(id, user_id, is_admin) {
  const t = await prisma.support_tickets.findUnique({ where: { id }, include: { user: { select: USER_SELECT } } });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  const [attachments, replies] = await Promise.all([get_attachments_for(id), get_replies_for(id)]);
  return normalize_ticket(t, attachments, replies);
}

export async function add_ticket_reply(ticket_id, user_id, is_admin, { message }) {
  const t = await prisma.support_tickets.findUnique({ where: { id: ticket_id } });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  if (!message?.trim()) throw app_error('Message is required');

  const reply = await prisma.ticket_replies.create({
    data: { ticket_id, user_id, message: message.trim(), is_admin_reply: is_admin },
    include: { user: { select: USER_SELECT } },
  });

  // Auto move to in_progress when admin replies on pending ticket
  if (is_admin && t.status === 'pending') {
    await prisma.support_tickets.update({ where: { id: ticket_id }, data: { status: 'in_progress' } });
  }

  return reply;
}

export async function add_ticket_attachment(ticket_id, user_id, is_admin, { file_key, file_name, file_size, mime_type }) {
  const t = await prisma.support_tickets.findUnique({ where: { id: ticket_id } });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  return prisma.file_uploads.create({
    data: { user_id, entity_type: 'ticket', entity_id: ticket_id, file_key, file_name, file_size: file_size || 0, mime_type, is_public: false },
  });
}

export async function get_ticket_stats() {
  const rows = await prisma.support_tickets.groupBy({ by: ['status'], _count: { id: true } });
  const by_status = {};
  for (const r of rows) by_status[r.status] = r._count.id;
  return { by_status, total: Object.values(by_status).reduce((s, v) => s + v, 0) };
}

export async function create_ticket({ user_id, subject, description, recipient_role, recipient_label, recipient_name, priority }) {
  const ticket_number = await next_ticket_number();
  const ticket = await prisma.support_tickets.create({
    data: { ticket_number, subject, description, recipient_role, recipient_label, recipient_name, priority, user_id },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
  return normalize_ticket(ticket);
}

export async function update_ticket_status(id, { status, resolution_note }) {
  const data = { status };
  if (resolution_note) data.resolution_note = resolution_note;
  if (status === 'resolved') data.resolved_at = new Date();
  return prisma.support_tickets.update({ where: { id }, data });
}

function normalize_ticket(t, attachments = [], replies = []) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    ticket_number: t.ticket_number,
    subject: t.subject,
    description: t.description,
    recipientRole: t.recipient_role,
    recipientLabel: t.recipient_label,
    recipientName: t.recipient_name,
    status: t.status,
    priority: t.priority,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
    resolutionNote: t.resolution_note,
    createdBy: t.user ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown',
    createdByEmail: t.user?.email || '',
    user: t.user,
    attachments,
    replies,
  };
}
