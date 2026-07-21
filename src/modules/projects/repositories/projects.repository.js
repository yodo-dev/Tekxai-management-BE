import prisma from '../../../shared/database/client.js';

const PROJECT_INCLUDE = {
  owner: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
  team_leader: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } },
  members: { select: { role: true, user: { select: { id: true, first_name: true, last_name: true, avatar: true, email: true } } } },
  milestones: { orderBy: { due_date: 'asc' }, select: { id: true, title: true, due_date: true, completed: true, blocked: true } },
  devops_access: {
    select: {
      git_access_status: true, server_access_status: true, domain_access_status: true,
      email_smtp_access_status: true, aws_access_status: true,
      point_of_communication: true, progress_shared_status: true,
    },
  },
  _count: { select: { members: true } },
};

const TERMINAL_STATUSES = ['COMPLETED', 'DELIVERED', 'ARCHIVED'];
const ACCESS_SCORE_FIELDS = ['git_access_status', 'server_access_status', 'domain_access_status', 'email_smtp_access_status', 'aws_access_status'];

// Batch-fetch client portal access for a set of project ids in a single query
// (avoids N+1 — client_project_access.project_id is a plain column, not a Prisma relation).
async function find_portal_map(project_ids) {
  const map = new Map();
  if (!project_ids.length) return map;
  const rows = await prisma.client_project_access.findMany({
    where: { project_id: { in: project_ids } },
    include: { client: { select: { id: true, name: true, status: true, portal_enabled: true } } },
  });
  for (const r of rows) if (!map.has(r.project_id)) map.set(r.project_id, r);
  return map;
}

function compute_milestone_breakdown(milestones = []) {
  const completed = milestones.filter((m) => m.completed).length;
  const blocked = milestones.filter((m) => !m.completed && m.blocked).length;
  const remaining = milestones.filter((m) => !m.completed).length;
  const current = milestones.find((m) => !m.completed && !m.blocked) || null;
  const now = new Date();
  const overdue = milestones.filter((m) => !m.completed && m.due_date && new Date(m.due_date) < now).length;
  return { completed, remaining, blocked, current, overdue };
}

function normalize_project(p, { is_saved = false, portal = null } = {}) {
  const now = new Date();
  const milestones = p.milestones || [];
  const breakdown = compute_milestone_breakdown(milestones);
  const is_overdue = !!(p.end_date && new Date(p.end_date) < now && !TERMINAL_STATUSES.includes(p.status));
  const days_remaining = p.end_date ? Math.ceil((new Date(p.end_date) - now) / 86400000) : null;

  const auto_progress = milestones.length > 0 ? Math.round((breakdown.completed / milestones.length) * 100) : 0;
  const progress = p.progress_mode === 'AUTO' ? auto_progress : p.progress;

  const devops = p.devops_access || null;
  const access_granted = devops ? ACCESS_SCORE_FIELDS.filter((f) => devops[f] === 'GRANTED').length : 0;
  const portal_granted = portal ? 1 : 0;
  const access_total = ACCESS_SCORE_FIELDS.length + 1; // +1 for client portal
  const access_completion_score = {
    granted: access_granted + portal_granted,
    total: access_total,
    percent: Math.round(((access_granted + portal_granted) / access_total) * 100),
  };

  // Weighted composite health score (100 = perfect). Purely computed, not stored.
  let health_score = 100
    - (is_overdue ? 25 : 0)
    - (breakdown.blocked * 10)
    - (breakdown.overdue * 10)
    - (Math.max(0, 100 - progress) * 0.2)
    - (Math.max(0, 100 - access_completion_score.percent) * 0.15);
  health_score = Math.max(0, Math.min(100, Math.round(health_score)));
  const health_status = health_score >= 75 ? 'HEALTHY' : health_score >= 40 ? 'WARNING' : 'CRITICAL';

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    project_type: p.project_type,
    progress,
    progress_mode: p.progress_mode,
    total_hours: p.total_hours,
    start_date: p.start_date,
    end_date: p.end_date,
    due_date: p.end_date,
    is_overdue,
    days_remaining,
    owner_id: p.owner_id,
    leader_id: p.leader_id,
    client_name: p.client_name,
    dev_status: p.dev_status,
    // Persisted correctly by create_project/update_project but previously
    // dropped here — the API returned no budget at all despite the DB
    // having the right value (Priority 1, confirmed root cause).
    budget: p.budget,
    budget_currency: p.budget_currency,
    budget_spent: p.budget_spent,
    owner: p.owner,
    team_leader: p.team_leader,
    members: p.members?.map((m) => ({ ...m.user, role: m.role })) || [],
    member_count: p._count?.members || 0,
    // Compact per-role counts for list-view badges (e.g. { FRONTEND: 2, BACKEND: 3, QA: 1 }).
    member_role_counts: (p.members || []).reduce((acc, m) => {
      const role = m.role || 'MEMBER';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {}),
    milestones,
    current_milestone: breakdown.current,
    pending_milestones_count: breakdown.remaining,
    milestone_breakdown: {
      completed: breakdown.completed,
      remaining: breakdown.remaining,
      blocked: breakdown.blocked,
      overdue: breakdown.overdue,
      current: breakdown.current,
    },
    access_completion_score,
    // Surfaces the same devops_access row already joined for access_completion_score
    // above — no extra query, no duplicated calculation. Lets list/dashboard views
    // show Point of Communication / Progress Shared / per-access-type status
    // without a second call to GET /project/:id/devops-access.
    devops_access: devops
      ? {
          point_of_communication: devops.point_of_communication,
          progress_shared_status: devops.progress_shared_status,
          git_access_status: devops.git_access_status,
          server_access_status: devops.server_access_status,
          domain_access_status: devops.domain_access_status,
          email_smtp_access_status: devops.email_smtp_access_status,
        }
      : null,
    client_portal: portal
      ? { enabled: true, portal_user: portal.client?.name || null, status: portal.client?.status || null, access_level: portal.access_level }
      : { enabled: false, portal_user: null, status: null, access_level: null },
    health_score,
    health_status,
    is_saved,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export async function find_projects({ search, page = 1, limit = 20, status, client_name, owner_id, overdue, user_id, member_only = false } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };

  // Employees only see projects they are a member of
  if (member_only && user_id) {
    where.members = { some: { user_id } };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (client_name) where.client_name = { contains: client_name, mode: 'insensitive' };
  if (owner_id) where.owner_id = owner_id;
  if (overdue === true || overdue === 'true') {
    where.end_date = { lt: new Date() };
    if (!status) where.status = { notIn: TERMINAL_STATUSES };
  }

  const [total, records] = await Promise.all([
    prisma.projects.count({ where }),
    prisma.projects.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: PROJECT_INCLUDE }),
  ]);

  const [saved_ids, portal_map] = await Promise.all([
    user_id
      ? prisma.starred_items.findMany({
          take: 500,
          where: { user_id, item_type: 'project', item_id: { in: records.map((r) => r.id) } },
        }).then((rows) => new Set(rows.map((s) => s.item_id)))
      : Promise.resolve(new Set()),
    find_portal_map(records.map((r) => r.id)),
  ]);

  return {
    records: records.map((p) => normalize_project(p, { is_saved: saved_ids.has(p.id), portal: portal_map.get(p.id) || null })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function find_project_by_id(id, user_id = null) {
  const p = await prisma.projects.findFirst({ where: { id, deleted_at: null }, include: PROJECT_INCLUDE });
  if (!p) return null;

  const [is_saved, portal_map] = await Promise.all([
    user_id
      ? prisma.starred_items.findFirst({ where: { user_id, item_type: 'project', item_id: id } }).then(Boolean)
      : Promise.resolve(false),
    find_portal_map([id]),
  ]);

  return normalize_project(p, { is_saved, portal: portal_map.get(id) || null });
}

// Normalizes the two accepted member-assignment shapes into project_members
// rows: the new `members: [{ user_id, role }]` (preferred, carries a
// functional role) and the legacy `member_ids: string[]` (kept for backward
// compatibility — every row defaults to role "MEMBER", the column's existing
// default, so old callers/tests keep working unchanged).
function to_member_rows(project_id, { member_ids, members }) {
  if (Array.isArray(members)) {
    return members.map((m) => ({ project_id, user_id: m.user_id, role: m.role || 'MEMBER' }));
  }
  return (member_ids || []).map((uid) => ({ project_id, user_id: uid }));
}

// Sprint 2 Milestone 5 — Project Master Consolidation, rule 3: projects.leader_id
// is the only source of truth for Team Lead. This keeps project_members in
// sync with it rather than letting the two disagree — demotes any stray
// TEAM_LEAD-tagged row that isn't the current leader, then tags the leader
// (creating a membership row if they weren't already a member). Idempotent
// and cheap (at most 2 small writes), safe to call on every create/update.
async function sync_team_lead_membership(tx, project_id, leader_id) {
  const stale_leads = await tx.project_members.findMany({
    where: { project_id, role: 'TEAM_LEAD', ...(leader_id ? { user_id: { not: leader_id } } : {}) },
    select: { user_id: true },
  });
  if (stale_leads.length > 0) {
    await tx.project_members.updateMany({
      where: { project_id, user_id: { in: stale_leads.map((m) => m.user_id) } },
      data: { role: 'MEMBER' },
    });
  }
  if (leader_id) {
    await tx.project_members.upsert({
      where: { project_id_user_id: { project_id, user_id: leader_id } },
      update: { role: 'TEAM_LEAD' },
      create: { project_id, user_id: leader_id, role: 'TEAM_LEAD' },
    });
  }
}

// Sequential, human-readable code (PRJ-0001, PRJ-0002, ...) — counts every
// project ever created (including soft-deleted) so codes never repeat even
// after a delete. Project creation is a low-frequency, admin-only action, so
// a count-based sequence inside the same transaction is sufficient; the
// column's own @@unique constraint is the backstop if it's ever wrong.
// Never accepted from client input — same convention as health_score/
// access_completion_score, which are also always computed, never client-set.
async function generate_project_code(tx) {
  const count = await tx.projects.count();
  return `PRJ-${String(count + 1).padStart(4, '0')}`;
}

export async function create_project({ title, description, start_date, end_date, total_hours, owner_id, leader_id, client_name, dev_status, progress_mode, project_type, priority, business_unit_id, budget, budget_currency, member_ids = [], members }) {
  // NOTE: the final read must happen *after* the transaction commits — calling
  // find_project_by_id (which uses the outer `prisma` client) from inside the
  // transaction callback reads via a separate connection that can't see the
  // still-uncommitted write yet, so it previously returned null/stale data.
  const project_id = await prisma.$transaction(async (tx) => {
    const project = await tx.projects.create({
      data: {
        title, description,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date:   end_date   ? new Date(end_date)   : undefined,
        total_hours: total_hours || 0,
        // owner_id/leader_id are foreign keys — an empty string isn't a valid
        // users.id and fails the FK constraint, rolling back the whole create.
        owner_id: owner_id || null,
        leader_id: leader_id || null,
        client_name: client_name || null,
        dev_status: dev_status || null,
        progress_mode: progress_mode || 'MANUAL',
        project_type: project_type || 'CLIENT',
        priority: priority || undefined,
        business_unit_id: business_unit_id || null,
        budget: budget !== undefined && budget !== null && budget !== '' ? +budget : null,
        budget_currency: budget_currency || undefined,
        project_code: await generate_project_code(tx),
      },
    });

    const member_rows = to_member_rows(project.id, { member_ids, members });
    if (member_rows.length > 0) {
      await tx.project_members.createMany({ data: member_rows, skipDuplicates: true });
    }

    // Milestone 5 rule 3 — leader_id is the only source of truth for Team
    // Lead; keep project_members in sync from the moment the project exists.
    await sync_team_lead_membership(tx, project.id, project.leader_id);

    return project.id;
  });

  return find_project_by_id(project_id);
}

export async function update_project(id, { title, description, status, progress, progress_mode, project_type, priority, business_unit_id, start_date, end_date, total_hours, owner_id, leader_id, client_name, dev_status, budget, budget_currency, budget_spent, member_ids, members, confirm_remove_all_members }) {
  // See create_project note above — read-after-write must happen post-commit.
  await prisma.$transaction(async (tx) => {
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (progress !== undefined) data.progress = progress;
    if (progress_mode !== undefined) data.progress_mode = progress_mode;
    if (project_type !== undefined) data.project_type = project_type;
    if (priority !== undefined) data.priority = priority;
    if (business_unit_id !== undefined) data.business_unit_id = business_unit_id || null;
    if (start_date !== undefined) data.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined)   data.end_date   = end_date   ? new Date(end_date)   : null;
    if (total_hours !== undefined) data.total_hours = total_hours;
    if (owner_id !== undefined) data.owner_id = owner_id || null;
    if (leader_id !== undefined) data.leader_id = leader_id || null;
    if (client_name !== undefined) data.client_name = client_name || null;
    if (dev_status !== undefined) data.dev_status = dev_status || null;
    if (budget !== undefined) data.budget = budget === null || budget === '' ? null : +budget;
    if (budget_currency !== undefined) data.budget_currency = budget_currency;
    if (budget_spent !== undefined) data.budget_spent = +budget_spent;

    const updated = await tx.projects.update({ where: { id }, data });

    // Milestone 5 rule 3 — run as soon as leader_id itself changes, whether
    // or not the member roster is also being touched in this same call.
    if (leader_id !== undefined) {
      await sync_team_lead_membership(tx, id, updated.leader_id);
    }

    if (Array.isArray(members) || Array.isArray(member_ids)) {
      const member_rows = to_member_rows(id, { member_ids, members });

      // Safety guard: a genuinely empty incoming list combined with an
      // existing non-empty membership is far more likely to be stale/
      // partially-loaded frontend state (see ProjectDetailsSlideOver's
      // members prefill) than an intentional "remove everyone" action.
      // Callers that really do want to clear membership must pass
      // confirm_remove_all_members explicitly — otherwise this update is
      // skipped as a no-op rather than silently wiping real members.
      if (member_rows.length === 0 && !confirm_remove_all_members) {
        const existing_count = await tx.project_members.count({ where: { project_id: id } });
        if (existing_count > 0) {
          return; // skip member replacement; all other fields still saved above
        }
      }

      const existing = await tx.project_members.findMany({ where: { project_id: id }, select: { user_id: true, role: true } });
      const existing_by_user = new Map(existing.map((m) => [m.user_id, m.role]));
      const incoming_by_user = new Map(member_rows.map((m) => [m.user_id, m.role]));

      const to_remove = existing.filter((m) => !incoming_by_user.has(m.user_id)).map((m) => m.user_id);
      const to_create = member_rows.filter((m) => !existing_by_user.has(m.user_id));
      const to_update = member_rows.filter((m) => existing_by_user.has(m.user_id) && existing_by_user.get(m.user_id) !== m.role);

      if (to_remove.length) {
        await tx.project_members.deleteMany({ where: { project_id: id, user_id: { in: to_remove } } });
      }
      if (to_create.length) {
        await tx.project_members.createMany({ data: to_create, skipDuplicates: true });
      }
      for (const m of to_update) {
        await tx.project_members.updateMany({ where: { project_id: id, user_id: m.user_id }, data: { role: m.role } });
      }

      // Milestone 5 rule 3 — leader_id itself wasn't part of this call (that
      // case already ran above), but the roster was just replaced — make
      // sure nothing in the incoming role list introduced a second,
      // conflicting TEAM_LEAD tag.
      if (leader_id === undefined) {
        await sync_team_lead_membership(tx, id, updated.leader_id);
      }
    }
  });

  return find_project_by_id(id);
}

export async function delete_project(id) {
  return prisma.projects.update({ where: { id }, data: { deleted_at: new Date() } });
}

export async function find_saved_projects(user_id, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const starred = await prisma.starred_items.findMany({
    where: { user_id, item_type: 'project' },
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
  });

  const project_ids = starred.map((s) => s.item_id);
  const [projects, portal_map] = await Promise.all([
    prisma.projects.findMany({
      take: 500,
      where: { id: { in: project_ids }, deleted_at: null },
      include: PROJECT_INCLUDE,
    }),
    find_portal_map(project_ids),
  ]);

  return projects.map((p) => normalize_project(p, { is_saved: true, portal: portal_map.get(p.id) || null }));
}

export async function save_project(user_id, project_id) {
  return prisma.starred_items.upsert({
    where: { user_id_item_type_item_id: { user_id, item_type: 'project', item_id: project_id } },
    update: {},
    create: { user_id, item_type: 'project', item_id: project_id, project_id },
  });
}

export async function unsave_project(user_id, project_id) {
  return prisma.starred_items.deleteMany({
    where: { user_id, item_type: 'project', item_id: project_id },
  });
}

// Dashboard KPI aggregate — reuses normalize_project's computed fields (is_overdue,
// health_status, access_completion_score, milestone_breakdown) so the numbers here
// always match what the project list/detail views show. Single query, not N+1.
export async function get_dashboard_stats() {
  const [records, portal_map] = await (async () => {
    const rows = await prisma.projects.findMany({ where: { deleted_at: null }, take: 1000, include: PROJECT_INCLUDE });
    const map = await find_portal_map(rows.map((r) => r.id));
    return [rows, map];
  })();

  const projects = records.map((p) => normalize_project(p, { portal: portal_map.get(p.id) || null }));

  const by_status = {};
  for (const p of projects) by_status[p.status] = (by_status[p.status] || 0) + 1;

  const stats = {
    total: projects.length,
    by_status,
    overdue: projects.filter((p) => p.is_overdue).length,
    blocked: projects.filter((p) => p.status === 'BLOCKED' || p.milestone_breakdown.blocked > 0).length,
    delivered: projects.filter((p) => p.status === 'DELIVERED' || p.status === 'COMPLETED').length,
    waiting_on_client: projects.filter((p) => p.status === 'CLIENT_REVIEW').length,
    needs_qa: projects.filter((p) => p.status === 'QA').length,
    access_incomplete: projects.filter((p) => p.access_completion_score.percent < 100).length,
    milestones_overdue: projects.reduce((sum, p) => sum + p.milestone_breakdown.overdue, 0),
    at_risk: projects.filter((p) => p.health_status !== 'HEALTHY').length,
    health: {
      healthy: projects.filter((p) => p.health_status === 'HEALTHY').length,
      warning: projects.filter((p) => p.health_status === 'WARNING').length,
      critical: projects.filter((p) => p.health_status === 'CRITICAL').length,
    },
  };

  return stats;
}

const EXTENSION_INCLUDE = {
  requester: { select: { id: true, first_name: true, last_name: true, avatar: true } },
  reviewer:  { select: { id: true, first_name: true, last_name: true, avatar: true } },
  project:   { select: { id: true, title: true } },
};

export async function create_extension_request({ project_id, requested_by, current_deadline, proposed_deadline, reason }) {
  return prisma.extension_requests.create({
    data: {
      project_id,
      requested_by,
      current_deadline: current_deadline ? new Date(current_deadline) : null,
      proposed_deadline: new Date(proposed_deadline),
      reason,
    },
    include: EXTENSION_INCLUDE,
  });
}

export async function find_extension_requests(project_id) {
  return prisma.extension_requests.findMany({
    where: { project_id },
    include: EXTENSION_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

export async function find_extension_request_by_id(id) {
  return prisma.extension_requests.findUnique({ where: { id }, include: EXTENSION_INCLUDE });
}

export async function review_extension_request(id, { status, reviewed_by, review_reason }) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.extension_requests.update({
      where: { id },
      data: { status, reviewed_by, review_reason: review_reason || null, reviewed_at: new Date() },
    });
    if (status === 'APPROVED') {
      await tx.projects.update({ where: { id: request.project_id }, data: { end_date: request.proposed_deadline } });
    }
    return request;
  }).then(() => find_extension_request_by_id(id));
}
