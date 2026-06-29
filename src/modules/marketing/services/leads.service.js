import prisma from '../../../shared/database/client.js';

// ── Upwork Bids ──────────────────────────────────────────────────────────────

export async function list_upwork_bids({ user_id, status, page = 1, limit = 50, is_admin } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = {};
  if (user_id && !is_admin) where.user_id = user_id;
  if (user_id && is_admin) where.user_id = user_id;
  if (status && status !== 'all') where.status = status;

  const [total, records] = await Promise.all([
    prisma.upwork_bids.count({ where }),
    prisma.upwork_bids.findMany({
      where, skip, take: limit,
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_upwork_bid(data) {
  return prisma.upwork_bids.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date() },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_upwork_bid(id, data) {
  return prisma.upwork_bids.update({
    where: { id },
    data: { ...data, date: data.date ? new Date(data.date) : undefined, updated_at: new Date() },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function delete_upwork_bid(id) {
  return prisma.upwork_bids.delete({ where: { id } });
}

// ── LinkedIn Leads ────────────────────────────────────────────────────────────

export async function list_linkedin_leads({ user_id, status, page = 1, limit = 50, is_admin } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = {};
  if (user_id && !is_admin) where.user_id = user_id;
  if (user_id && is_admin) where.user_id = user_id;
  if (status && status !== 'all') where.status = status;

  const [total, records] = await Promise.all([
    prisma.linkedin_leads.count({ where }),
    prisma.linkedin_leads.findMany({
      where, skip, take: limit,
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_linkedin_lead(data) {
  return prisma.linkedin_leads.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date() },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_linkedin_lead(id, data) {
  return prisma.linkedin_leads.update({
    where: { id },
    data: { ...data, date: data.date ? new Date(data.date) : undefined, updated_at: new Date() },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function delete_linkedin_lead(id) {
  return prisma.linkedin_leads.delete({ where: { id } });
}

// ── Email Leads ───────────────────────────────────────────────────────────────

export async function list_email_leads({ user_id, status, page = 1, limit = 50, is_admin } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = {};
  if (user_id && !is_admin) where.user_id = user_id;
  if (user_id && is_admin) where.user_id = user_id;
  if (status && status !== 'all') where.status = status;

  const [total, records] = await Promise.all([
    prisma.email_leads.count({ where }),
    prisma.email_leads.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_email_lead(data) {
  return prisma.email_leads.create({
    data,
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function update_email_lead(id, data) {
  return prisma.email_leads.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
    include: { user: { select: { id: true, first_name: true, last_name: true } } },
  });
}

export async function delete_email_lead(id) {
  return prisma.email_leads.delete({ where: { id } });
}

// ── LinkedIn Activity ─────────────────────────────────────────────────────────

export async function list_linkedin_activity({ user_id, page = 1, limit = 50 } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;
  const where = user_id ? { user_id } : {};

  const [total, records] = await Promise.all([
    prisma.linkedin_activity.count({ where }),
    prisma.linkedin_activity.findMany({
      where, skip, take: limit,
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    }),
  ]);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create_linkedin_activity(data) {
  return prisma.linkedin_activity.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date() },
  });
}

// ── Lead Activities (notes/history per lead) ──────────────────────────────────

export async function list_lead_activities(lead_id, lead_source) {
  return prisma.lead_activities.findMany({
    where: { lead_id, lead_source },
    orderBy: { created_at: 'desc' },
    take: 500,
  });
}

export async function create_lead_activity(data) {
  return prisma.lead_activities.create({ data });
}

// ── Won Deals (bids/leads with Win status) ────────────────────────────────────

export async function list_won_deals({ user_id, source, page = 1, limit = 50, from, to } = {}) {
  page = +page || 1; limit = +limit || 50;
  const skip = (page - 1) * limit;

  const upwhere = { status: 'Win' };
  const liwhere = { status: 'Win' };
  if (user_id) { upwhere.user_id = user_id; liwhere.user_id = user_id; }
  if (from) { upwhere.date = { gte: new Date(from) }; liwhere.date = { gte: new Date(from) }; }
  if (to) {
    upwhere.date = { ...(upwhere.date || {}), lte: new Date(to) };
    liwhere.date = { ...(liwhere.date || {}), lte: new Date(to) };
  }

  const userSelect = { id: true, first_name: true, last_name: true, avatar: true };

  let upwork = [], linkedin = [];
  if (!source || source === 'all' || source === 'Upwork') {
    const rows = await prisma.upwork_bids.findMany({
      where: upwhere, orderBy: { date: 'desc' }, take: 500,
      include: { user: { select: userSelect } },
    });
    upwork = rows.map(r => ({ ...r, _source: 'Upwork' }));
  }
  if (!source || source === 'all' || source === 'LinkedIn') {
    const rows = await prisma.linkedin_leads.findMany({
      where: liwhere, orderBy: { date: 'desc' }, take: 500,
      include: { user: { select: userSelect } },
    });
    linkedin = rows.map(r => ({ ...r, _source: 'LinkedIn', job_title: r.full_name }));
  }

  const combined = [...upwork, ...linkedin].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = combined.length;
  const records = combined.slice(skip, skip + limit);
  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}
