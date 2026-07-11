import prisma from '../../../shared/database/client.js';
import { list_projects } from '../../projects/services/projects.service.js';

// "Queued" has no literal status value in the system yet — the two statuses that
// represent work not yet actively underway are mapped here. Documented explicitly
// so the mapping is visible rather than silently baked in.
const QUEUED_STATUSES = ['PENDING', 'PLANNING'];
const COMPLETED_STATUSES = ['COMPLETED', 'DELIVERED'];
const TERMINAL_STATUSES = ['COMPLETED', 'DELIVERED', 'ARCHIVED'];

// An employee allocated to more than this many active projects at once is
// surfaced as overloaded. A simple, documented business rule — not derived
// from any per-employee capacity setting, since none exists in the schema yet.
const OVERLOAD_THRESHOLD = 3;

const project_summary = (p) => ({
  id: p.id,
  title: p.title,
  client_name: p.client_name,
  status: p.status,
  end_date: p.end_date,
  days_remaining: p.days_remaining,
  health_status: p.health_status,
});

export async function get_post_sales_dashboard() {
  const now = new Date();
  const week_from_now = new Date(now.getTime() + 7 * 86400000);
  const week_ago = new Date(now.getTime() - 7 * 86400000);

  const { records: projects } = await list_projects({ page: 1, limit: 1000 }, null);
  const active_projects = projects.filter((p) => !TERMINAL_STATUSES.includes(p.status));

  // ── Top KPIs ──────────────────────────────────────────────────────────────
  const active_client_names = new Set(active_projects.filter((p) => p.client_name).map((p) => p.client_name));
  const due_this_week = active_projects.filter((p) => p.end_date && new Date(p.end_date) >= now && new Date(p.end_date) <= week_from_now);

  const top_kpis = {
    active_clients: active_client_names.size,
    active_projects: active_projects.length,
    queued_projects: projects.filter((p) => QUEUED_STATUSES.includes(p.status)).length,
    completed_projects: projects.filter((p) => COMPLETED_STATUSES.includes(p.status)).length,
    overdue_projects: projects.filter((p) => p.is_overdue).length,
    projects_due_this_week: due_this_week.length,
  };

  // ── Project Health ───────────────────────────────────────────────────────
  const critical = active_projects.filter((p) => p.health_status === 'CRITICAL');
  const blocked = active_projects.filter((p) => p.status === 'BLOCKED' || p.milestone_breakdown.blocked > 0);
  const missing_team = active_projects.filter((p) => p.member_count === 0);
  const missing_milestones = active_projects.filter((p) => p.milestones.length === 0);
  const missing_pm = active_projects.filter((p) => !p.leader_id);
  const waiting_on_client = active_projects.filter((p) => p.status === 'CLIENT_REVIEW');

  const project_health = {
    critical_projects: { count: critical.length, projects: critical.slice(0, 10).map(project_summary) },
    blocked_projects: { count: blocked.length, projects: blocked.slice(0, 10).map(project_summary) },
    missing_team_members: { count: missing_team.length, projects: missing_team.slice(0, 10).map(project_summary) },
    missing_milestones: { count: missing_milestones.length, projects: missing_milestones.slice(0, 10).map(project_summary) },
    missing_project_manager: { count: missing_pm.length, projects: missing_pm.slice(0, 10).map(project_summary) },
    waiting_for_client_response: { count: waiting_on_client.length, projects: waiting_on_client.slice(0, 10).map(project_summary) },
  };

  // ── Project Status Distribution ──────────────────────────────────────────
  const status_distribution = {};
  for (const p of projects) status_distribution[p.status] = (status_distribution[p.status] || 0) + 1;

  // ── Timeline ──────────────────────────────────────────────────────────────
  const upcoming_due = active_projects
    .filter((p) => p.end_date && new Date(p.end_date) >= now)
    .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
    .slice(0, 10)
    .map(project_summary);
  const overdue_due = active_projects
    .filter((p) => p.is_overdue)
    .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
    .slice(0, 10)
    .map(project_summary);
  const no_activity = active_projects
    .filter((p) => new Date(p.updated_at) < week_ago)
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    .slice(0, 10)
    .map((p) => ({ ...project_summary(p), last_updated: p.updated_at }));

  const [upcoming_milestones, overdue_milestones] = await Promise.all([
    prisma.milestones.findMany({
      where: { completed: false, due_date: { gte: now }, project: { deleted_at: null } },
      orderBy: { due_date: 'asc' },
      take: 10,
      include: { project: { select: { id: true, title: true, client_name: true } } },
    }),
    prisma.milestones.findMany({
      where: { completed: false, due_date: { lt: now }, project: { deleted_at: null } },
      orderBy: { due_date: 'asc' },
      take: 10,
      include: { project: { select: { id: true, title: true, client_name: true } } },
    }),
  ]);

  const timeline = {
    upcoming_due_dates: upcoming_due,
    overdue_due_dates: overdue_due,
    upcoming_milestones: upcoming_milestones.map((m) => ({ id: m.id, title: m.title, due_date: m.due_date, project: m.project })),
    overdue_milestones: overdue_milestones.map((m) => ({ id: m.id, title: m.title, due_date: m.due_date, project: m.project })),
    projects_with_no_activity: no_activity,
  };

  // ── Resource Overview (generic — no role-specific terminology) ──────────────
  const employees = await prisma.users.findMany({
    take: 1000,
    where: { is_active: true, deleted_at: null, business_unit: 'ERP' },
    select: { id: true, first_name: true, last_name: true, department: { select: { id: true, name: true } } },
  });

  const allocation_by_user = new Map(employees.map((e) => [e.id, 0]));
  for (const p of active_projects) {
    for (const m of p.members) {
      if (allocation_by_user.has(m.id)) allocation_by_user.set(m.id, allocation_by_user.get(m.id) + 1);
    }
  }

  const employee_allocation = employees
    .map((e) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`.trim(),
      department: e.department?.name || 'Unassigned',
      active_projects: allocation_by_user.get(e.id) || 0,
    }))
    .sort((a, b) => b.active_projects - a.active_projects);

  const overloaded = employee_allocation.filter((e) => e.active_projects > OVERLOAD_THRESHOLD);
  const available = employee_allocation.filter((e) => e.active_projects === 0);

  const dept_map = new Map();
  for (const e of employee_allocation) {
    const key = e.department;
    if (!dept_map.has(key)) dept_map.set(key, { department: key, employee_count: 0, active_projects: 0 });
    const d = dept_map.get(key);
    d.employee_count += 1;
    d.active_projects += e.active_projects;
  }

  const resource_overview = {
    employee_allocation: employee_allocation.slice(0, 20),
    employees_overloaded: { count: overloaded.length, employees: overloaded.slice(0, 10) },
    employees_available: { count: available.length, employees: available.slice(0, 10) },
    department_workload: Array.from(dept_map.values()).sort((a, b) => b.active_projects - a.active_projects),
    team_capacity: {
      total_employees: employees.length,
      allocated: employee_allocation.filter((e) => e.active_projects > 0).length,
      available: available.length,
      overload_threshold: OVERLOAD_THRESHOLD,
    },
  };

  // ── Client Success ────────────────────────────────────────────────────────
  const recent_client_activity = await prisma.client_weekly_updates.findMany({
    take: 10,
    orderBy: { update_date: 'desc' },
    where: { project: { deleted_at: null } },
    include: {
      project: { select: { id: true, title: true, client_name: true } },
      updater: { select: { id: true, first_name: true, last_name: true } },
    },
  });

  const client_success = {
    clients_with_active_projects: active_client_names.size,
    clients_waiting_for_feedback: new Set(waiting_on_client.filter((p) => p.client_name).map((p) => p.client_name)).size,
    projects_waiting_for_client: waiting_on_client.length,
    client_satisfaction: null, // no client-satisfaction data source exists in the current schema
    recent_client_activity: recent_client_activity.map((u) => ({
      id: u.id,
      project: u.project,
      update_date: u.update_date,
      summary: u.summary,
      client_response: u.client_response,
      updated_by: u.updater ? `${u.updater.first_name} ${u.updater.last_name}`.trim() : null,
    })),
  };

  return { top_kpis, project_health, status_distribution, timeline, resource_overview, client_success };
}
