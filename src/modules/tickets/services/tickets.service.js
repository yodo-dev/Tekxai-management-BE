import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

async function next_ticket_number() {
  const last = await prisma.support_tickets.findFirst({ orderBy: { created_at: 'desc' } });
  if (!last) return 'TKT-1001';
  const num = parseInt(last.ticket_number.replace('TKT-', ''), 10) || 1000;
  return `TKT-${num + 1}`;
}

export async function list_tickets({ user_id, is_admin = false, status, priority, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (!is_admin) where.user_id = user_id;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [total, records] = await Promise.all([
    prisma.support_tickets.count({ where }),
    prisma.support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } } },
    }),
  ]);

  return { records: records.map(normalize_ticket), total, page, limit, pages: Math.ceil(total / limit) };
}

export async function get_ticket(id, user_id, is_admin) {
  const t = await prisma.support_tickets.findUnique({
    where: { id },
    include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
  });
  if (!t) throw app_error('Ticket not found', 404);
  if (!is_admin && t.user_id !== user_id) throw app_error('Forbidden', 403);
  return normalize_ticket(t);
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

function normalize_ticket(t) {
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
  };
}
