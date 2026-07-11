
import prisma from '../../../shared/database/client.js';
export const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD'];

// Unified leads list across all 3 sources
export async function list_unified_leads({ user_id, role, source, stage, is_hot, page = 1, limit = 20 } = {}) {
  const p = +page || 1;
  const l = +limit || 20;
  const is_manager = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  const user_filter = is_manager ? {} : { user_id };
  const stage_filter = stage ? { pipeline_stage: stage } : {};
  const hot_filter   = is_hot === 'true' ? { is_hot: true } : {};

  const [upwork, linkedin, email] = await Promise.all([
    (!source || source === 'upwork') ? prisma.upwork_bids.findMany({
      where: { ...user_filter, ...stage_filter, ...hot_filter },
      orderBy: { updated_at: 'desc' },
      take: l,
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    }) : [],
    (!source || source === 'linkedin') ? prisma.linkedin_leads.findMany({
      where: { ...user_filter, ...stage_filter, ...hot_filter },
      orderBy: { updated_at: 'desc' },
      take: l,
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    }) : [],
    (!source || source === 'email') ? prisma.email_leads.findMany({
      where: { ...user_filter, ...stage_filter, ...hot_filter },
      orderBy: { updated_at: 'desc' },
      take: l,
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    }) : [],
  ]);

  // Normalize to unified shape
  const normalize = (item, src) => ({
    _source: src,
    id: item.id,
    title: item.job_title || item.full_name || item.company_name || 'Unnamed Lead',
    contact_name: item.client_name || item.full_name || null,
    email: item.email || item.email_1 || null,
    status: item.status,
    pipeline_stage: item.pipeline_stage || 'NEW',
    is_hot: item.is_hot,
    value: item.contract_amount || item.rate || 0,
    owner: item.user,
    date: item.date || item.created_at,
    updated_at: item.updated_at,
  });

  const all = [
    ...upwork.map(i => normalize(i, 'upwork')),
    ...linkedin.map(i => normalize(i, 'linkedin')),
    ...email.map(i => normalize(i, 'email')),
  ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return { records: all.slice(0, l), total: all.length };
}

export async function update_lead_stage(source, id, pipeline_stage, user_id) {
  if (!PIPELINE_STAGES.includes(pipeline_stage)) {
    throw Object.assign(new Error('Invalid pipeline stage'), { status: 400 });
  }
  const models = { upwork: 'upwork_bids', linkedin: 'linkedin_leads', email: 'email_leads' };
  const model_name = models[source];
  if (!model_name) throw Object.assign(new Error('Invalid source'), { status: 400 });

  return prisma[model_name].update({
    where: { id },
    data: { pipeline_stage, updated_at: new Date() },
  });
}

// CRM Handoffs
export async function list_handoffs({ user_id, role, status, page = 1, limit = 20 } = {}) {
  const p = +page || 1; const l = +limit || 20;
  const is_manager = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  const where = {};
  if (!is_manager) where.OR = [{ created_by: user_id }, { assigned_to_id: user_id }];
  if (status) where.status = status;
  const [total, records] = await Promise.all([
    prisma.crm_handoffs.count({ where }),
    prisma.crm_handoffs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (p - 1) * l,
      take: l,
      include: {
        assigned_to: { select: { id: true, first_name: true, last_name: true } },
        creator: { select: { id: true, first_name: true, last_name: true } },
        project: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);
  return { records, total, page: p, limit: l };
}

export async function create_handoff(data, user_id) {
  return prisma.crm_handoffs.create({
    data: { ...data, created_by: user_id, status: 'PENDING' },
    include: {
      assigned_to: { select: { id: true, first_name: true, last_name: true } },
      creator: { select: { id: true, first_name: true, last_name: true } },
    },
  });
}

export async function update_handoff(id, data) {
  return prisma.crm_handoffs.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
    include: {
      assigned_to: { select: { id: true, first_name: true, last_name: true } },
      project: { select: { id: true, title: true, status: true } },
    },
  });
}

// CRM Invoices
export async function list_invoices({ client_account_id, project_id, status, page = 1, limit = 20 } = {}) {
  const p = +page || 1; const l = +limit || 20;
  const where = {};
  if (client_account_id) where.client_account_id = client_account_id;
  if (project_id) where.project_id = project_id;
  if (status) where.status = status;
  const [total, records] = await Promise.all([
    prisma.crm_invoices.count({ where }),
    prisma.crm_invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (p - 1) * l,
      take: l,
      include: {
        client_account: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, title: true, project_type: true } },
      },
    }),
  ]);
  return { records, total, page: p, limit: l };
}

export async function create_invoice(data, user_id) {
  const inv_no = data.invoice_number || `INV-${Date.now()}`;
  return prisma.crm_invoices.create({
    data: { ...data, invoice_number: inv_no, created_by: user_id },
    include: {
      client_account: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true, project_type: true } },
    },
  });
}

export async function update_invoice(id, data) {
  return prisma.crm_invoices.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
  });
}
