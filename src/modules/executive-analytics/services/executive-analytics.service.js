// Enterprise Performance Platform — Executive Analytics (Phase 4, Milestone 7).
// Explicitly a composition layer: reuses the Post-Sales Dashboard's existing
// Resource Overview (= Capacity), Project Health (= Delivery Health), and
// Client Success (= Client Health) sections verbatim, plus new ROI/Performance
// summary data from Phase 2/3, rather than rebuilding any of it. Compute-on-read,
// no new aggregate tables — the same pattern every prior phase used.
// See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.1, §11.5.
import prisma from '../../../shared/database/client.js';
import { get_post_sales_dashboard } from '../../crm/services/post-sales-dashboard.service.js';
import { get_business_unit_performance } from '../../enterprise-performance/services/enterprise-performance.service.js';
import { get_employee_roi } from '../../roi/services/roi.service.js';
// Sprint 2 Milestone 1 — Executive Dashboard additions. Every import below is
// an EXISTING service/engine function; nothing here re-implements a
// calculation that already lives somewhere else (see TECH_DEBT_REGISTER.md
// for the pre-existing surfaces this sprint explicitly leaves untouched).
import { get_employee_stats_summary } from '../../employees/routes/employees.routes.js';
import { get_dashboard as get_project_dashboard } from '../../projects/services/projects.service.js';
import { get_ticket_stats, list_tickets } from '../../tickets/services/tickets.service.js';
import { get_expense_summary } from '../../expenses/controllers/expenses.controller.js';
import { get_requisition_stats } from '../../requisitions/controllers/requisitions.controller.js';
import { get_depreciation_report, get_inventory_report, list_asset_requests } from '../../assets/services/assets.service.js';
import { list_escalation_history } from '../../compliance-escalation/services/compliance-escalation.service.js';
import { compute_kpi, compute_aggregate, compute_report } from '../../reports/report_builder.controller.js';

function month_bounds(month, year) {
  const m = +month, y = +year;
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

// ROI rollup across every business unit that has rule-engine rows (§11.4) — a
// unit is addable purely as a data row, so this list is never hardcoded.
async function get_company_roi_rollup({ month, year }) {
  const units = await prisma.business_unit_rules.findMany({ where: { is_active: true }, select: { business_unit: true } });
  const rollups = await Promise.all(
    units.map(async (u) => {
      const perf = await get_business_unit_performance(u.business_unit, { month, year });
      const roi = perf.cost > 0 ? Math.round((perf.revenue.attributed_amount / perf.cost) * 1000) / 1000 : null;
      return { business_unit: u.business_unit, revenue: perf.revenue.attributed_amount, cost: perf.cost, roi, employee_count: perf.employee_count };
    })
  );
  return rollups;
}

// Top/bottom performer lists — only among employees who actually logged time in
// the period, since ROI is undefined (no work = no basis) for everyone else.
async function get_performer_rankings({ month, year }, limit = 5) {
  const { start, end } = month_bounds(month, year);
  const active_logs = await prisma.task_time_logs.findMany({
    take: 5000,
    where: { logged_at: { gte: start, lt: end } },
    select: { user_id: true },
    distinct: ['user_id'],
  });
  const user_ids = active_logs.map((l) => l.user_id);
  if (user_ids.length === 0) return { top_performers: [], bottom_performers: [], ranked_count: 0 };

  const rois = await Promise.all(user_ids.map((uid) => get_employee_roi(uid, { month, year }).catch(() => null)));
  const ranked = rois
    .filter((r) => r && r.basis === 'revenue_over_cost')
    .map((r) => ({ user_id: r.user_id, name: r.name, business_unit: r.business_unit, roi: r.roi, roi_percent: r.roi_percent, revenue: r.revenue.attributed_amount, cost: r.cost }))
    .sort((a, b) => b.roi - a.roi);

  return {
    top_performers: ranked.slice(0, limit),
    bottom_performers: ranked.slice(-limit).reverse(),
    ranked_count: ranked.length,
  };
}

function day_bounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

// Sprint 2 Milestone 1 — Executive Operations Intelligence. Pure orchestration:
// every value below comes from an existing service/report_builder call. Where
// nothing existing computed a metric (budget utilization, monitoring coverage,
// top applications, today-scoped attendance/leave, current payroll cost), the
// generic Report Builder KPI/aggregate engine is used — never a new bespoke
// query — per the sprint's "reuse first, generic engine second, never a third
// parallel implementation" rule.
async function get_operations_intelligence({ month, year }, { employee_stats, project_dashboard }) {
  const now = new Date();
  const period_start = new Date(year, month - 1, 1).toISOString();
  const period_end = new Date(year, month, 1).toISOString();
  const today = day_bounds(now);

  const [
    ticket_stats,
    expense_summary,
    requisition_stats,
    depreciation,
    inventory,
    escalations,
    payroll_cost,
    ticket_sla_overdue,
    attendance_today,
    late_today,
    leave_today,
    leave_pending,
    budget_totals,
    avg_productivity,
    screenshot_count,
    monitoring_active_users,
    top_applications,
  ] = await Promise.all([
    get_ticket_stats(),
    get_expense_summary({ from: period_start, to: period_end }),
    get_requisition_stats(),
    get_depreciation_report(),
    get_inventory_report(),
    list_escalation_history({ limit: 1 }),
    compute_kpi({ entity: 'payroll_runs', metric: 'SUM', field: 'total_net', filters: { period_month: +month, period_year: +year } }),
    list_tickets({ is_admin: true, sla: 'overdue', limit: 1 }),
    compute_kpi({ entity: 'timesheet_entries', metric: 'COUNT', filters: { created_at: today } }),
    compute_kpi({ entity: 'attendance_violations', metric: 'COUNT', filters: { violation_type: 'LATE', date: today } }),
    compute_kpi({ entity: 'time_off_requests', metric: 'COUNT', filters: { status: 'APPROVED', start_date: today } }),
    compute_kpi({ entity: 'time_off_requests', metric: 'COUNT', filters: { status: 'PENDING' } }),
    compute_aggregate({ entity: 'projects', group_by: 'status', metric_field: 'budget' }).catch(() => null),
    compute_kpi({ entity: 'productivity_sessions', metric: 'AVG', field: 'productivity_score', filters: { date: today } }),
    compute_kpi({ entity: 'screenshots', metric: 'COUNT', filters: { created_at: today } }),
    compute_aggregate({ entity: 'productivity_sessions', group_by: 'user_id' }),
    compute_aggregate({ entity: 'app_usage_logs', group_by: 'app_name', metric_field: 'duration_seconds' }),
  ]);

  // Budget utilization = sum(budget_spent)/sum(budget) across projects — both
  // fields already registered as numeric on the `projects` entity; computed
  // here as a ratio of two existing report_builder SUM calls, not a new query.
  const [budget_sum, spent_sum] = await Promise.all([
    compute_kpi({ entity: 'projects', metric: 'SUM', field: 'budget' }),
    compute_kpi({ entity: 'projects', metric: 'SUM', field: 'budget_spent' }),
  ]);
  const budget_utilization_pct = budget_sum.value > 0 ? Math.round((spent_sum.value / budget_sum.value) * 1000) / 10 : null;

  const active_assets = (inventory.by_status || []).find((g) => g.status === 'ASSIGNED')?.count ?? null;

  return {
    company_overview: {
      employees: employee_stats.total,
      active_projects: project_dashboard.total ?? null,
      open_tickets: (ticket_stats.by_status?.pending || 0) + (ticket_stats.by_status?.in_progress || 0),
      active_assets,
      monthly_expense: expense_summary.total_spent,
      current_payroll: payroll_cost.value,
    },
    operations: {
      project_health: project_dashboard.health,
      blocked_projects: project_dashboard.blocked,
      ticket_sla_overdue: ticket_sla_overdue.total,
      attendance_today: attendance_today.value,
      late_employees_today: late_today.value,
      leave_today: leave_today.value,
    },
    financial: {
      monthly_expense: expense_summary.total_spent,
      payroll_cost: payroll_cost.value,
      asset_value: depreciation.total_current_value,
      budget_utilization_pct,
    },
    productivity: {
      productivity_pct: avg_productivity.value != null ? Math.round(avg_productivity.value) : null,
      monitoring_coverage_pct: employee_stats.total > 0
        ? Math.round(((monitoring_active_users.rows?.length || 0) / employee_stats.total) * 1000) / 10
        : null,
      screenshot_count: screenshot_count.value,
      top_applications: (top_applications.rows || []).slice(0, 5),
    },
    alerts: {
      overdue_approvals: {
        requisitions_pending: requisition_stats.by_status?.PENDING || 0,
        tickets_pending: ticket_stats.by_status?.pending || 0,
        leave_pending: leave_pending.value,
      },
      overdue_tickets: ticket_sla_overdue.total,
      blocked_projects: project_dashboard.blocked,
      probation_reminders: employee_stats.probation,
      compliance_reminders: escalations.total,
    },
  };
}

export async function get_executive_dashboard({ month, year }) {
  // Fetched once and shared with both get_operations_intelligence() and
  // get_executive_insights() below — each originally called these
  // separately, which meant the (fairly expensive, up-to-1000-row) projects
  // dashboard query ran twice per request. Phase 6 performance audit caught
  // this; sharing the single result removes the duplicate query.
  const [employee_stats, project_dashboard] = await Promise.all([
    get_employee_stats_summary(),
    get_project_dashboard(),
  ]);
  const shared = { employee_stats, project_dashboard };

  const [post_sales, company_roi, performers, operations, insights, action_center_raw] = await Promise.all([
    get_post_sales_dashboard(),
    get_company_roi_rollup({ month, year }),
    get_performer_rankings({ month, year }),
    get_operations_intelligence({ month, year }, shared),
    get_executive_insights({ month, year }, shared),
    get_action_center_raw({ month, year }, shared),
  ]);

  // Combines operations/insights' already-resolved values with the
  // independently-fetched action_center_raw above — no DB calls here, so no
  // extra serial round-trip stacked onto the request.
  const action_center = build_action_center(shared, operations, insights.insights, action_center_raw);

  return {
    period: { month: +month, year: +year },
    // Reused verbatim from the Post-Sales Dashboard, per the roadmap's own
    // "reuse, don't rebuild" instruction for Milestone 7.
    capacity: post_sales.resource_overview,
    delivery_health: post_sales.project_health,
    client_health: post_sales.client_success,
    top_kpis: post_sales.top_kpis,
    // New for Milestone 7 — composed from Phase 2/3's Performance/ROI Engines.
    performance_summary: {
      company_roi_by_business_unit: company_roi,
      top_performers: performers.top_performers,
      bottom_performers: performers.bottom_performers,
      ranked_employee_count: performers.ranked_count,
    },
    // New for Sprint 2 Milestone 1 — company-wide operational sections
    // (Company Overview / Operations / Financial / Productivity / Alerts),
    // pure orchestration over existing services + the generic report_builder
    // KPI/aggregate engine. See get_operations_intelligence() above.
    ...operations,
    // New for Sprint 2 Milestone 2 — trends + prioritized alerts, layered
    // onto the same single dashboard response rather than a second endpoint.
    // See get_executive_insights()/prioritize_alerts() below.
    ...insights,
    priority_alerts: prioritize_alerts(operations.alerts),
    // New for Sprint 2 Milestone 3 — Executive Action Center: the same
    // already-computed alerts/insights values, plus a handful of new
    // independent lookups, bucketed into requires_attention / requires_review
    // / informational with a deterministic priority sort. See
    // get_action_center() below.
    action_center,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sprint 2 Milestone 2 — Executive Insights (trends + prioritized alerts).
//
// No new reporting architecture: every trend below is two report_builder
// KPI calls (current window vs. the immediately-preceding window of equal
// length) over a timestamp field already registered in ENTITY_MAP. This is
// the same generic engine Milestone 1 used, just called twice with
// different {from,to} filters — never a bespoke time-series table or a
// second aggregation path.
// ─────────────────────────────────────────────────────────────────────────

function range_bounds(days, offset_days = 0) {
  const now = new Date();
  const to = new Date(now.getTime() - offset_days * 24 * 60 * 60 * 1000);
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function pct_delta(current, previous) {
  if (previous === 0 || previous == null) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// current window vs. the immediately-preceding window of equal length —
// e.g. days=30 compares "last 30 days" against "the 30 days before that".
async function trend_kpi({ entity, metric = 'COUNT', field, date_field, days, extra_filters = {} }) {
  const current_range = range_bounds(days, 0);
  const previous_range = range_bounds(days, days);
  const [current, previous] = await Promise.all([
    compute_kpi({ entity, metric, field, filters: { ...extra_filters, [date_field]: current_range } }),
    compute_kpi({ entity, metric, field, filters: { ...extra_filters, [date_field]: previous_range } }),
  ]);
  return { current: current.value, previous: previous.value, delta_pct: pct_delta(current.value, previous.value) };
}

async function get_executive_insights({ month, year }, { employee_stats, project_dashboard }) {
  const now = new Date();
  const next_7d = { from: now.toISOString(), to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  const prev_month = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };

  const [
    hiring_30d,
    attrition_30d,
    probation_ending_soon,
    upcoming_milestones,
    expense_30d,
    payroll_current,
    payroll_previous,
    productivity_7d,
    coverage_current,
    coverage_previous,
    attendance_7d,
    ticket_volume_30d,
    ticket_resolved_30d,
    budget_rows,
  ] = await Promise.all([
    trend_kpi({ entity: 'users', metric: 'COUNT', date_field: 'created_at', days: 30 }),
    trend_kpi({ entity: 'employee_profiles', metric: 'COUNT', date_field: 'termination_date', days: 30, extra_filters: { employment_status: 'TERMINATED' } }),
    compute_kpi({ entity: 'employee_profiles', metric: 'COUNT', filters: { probation_status: 'ONGOING', probation_end: next_7d } }),
    compute_kpi({ entity: 'milestones', metric: 'COUNT', filters: { completed: false, due_date: next_7d } }),
    trend_kpi({ entity: 'expense_transactions', metric: 'SUM', field: 'total_amount', date_field: 'date', days: 30 }),
    compute_kpi({ entity: 'payroll_runs', metric: 'SUM', field: 'total_net', filters: { period_month: month, period_year: year } }),
    compute_kpi({ entity: 'payroll_runs', metric: 'SUM', field: 'total_net', filters: { period_month: prev_month.month, period_year: prev_month.year } }),
    trend_kpi({ entity: 'productivity_sessions', metric: 'AVG', field: 'productivity_score', date_field: 'date', days: 7 }),
    compute_aggregate({ entity: 'productivity_sessions', group_by: 'user_id', filters: { date: range_bounds(7, 0) } }),
    compute_aggregate({ entity: 'productivity_sessions', group_by: 'user_id', filters: { date: range_bounds(7, 7) } }),
    trend_kpi({ entity: 'attendance_violations', metric: 'COUNT', date_field: 'date', days: 7, extra_filters: { violation_type: 'LATE' } }),
    trend_kpi({ entity: 'support_tickets', metric: 'COUNT', date_field: 'created_at', days: 30 }),
    trend_kpi({ entity: 'support_tickets', metric: 'COUNT', date_field: 'resolved_at', days: 30 }),
    // Budget-overrun risk needs a column-to-column comparison (budget_spent
    // vs. budget per project) which the generic filter/aggregate shape can't
    // express (same class of gap as ticket SLA — see report_builder.controller.js).
    // compute_report() reuses the generic paginated-detail path to fetch the
    // two numeric columns; the >, comparison itself is a one-line reduction
    // over that reused data, not a new query or duplicated business rule.
    compute_report({ entity: 'projects', columns: ['id', 'budget', 'budget_spent'], limit: 1000 }),
  ]);

  const budget_overrun_count = (budget_rows.data || []).filter((p) => p.budget != null && p.budget_spent != null && p.budget_spent > p.budget).length;
  const payroll_trend_pct = pct_delta(payroll_current.value, payroll_previous.value);
  const coverage_pct = (rows) => employee_stats.total > 0 ? Math.round(((rows.rows?.length || 0) / employee_stats.total) * 1000) / 10 : null;
  const coverage_current_pct = coverage_pct(coverage_current);
  const coverage_previous_pct = coverage_pct(coverage_previous);

  return {
    insights: {
      workforce: {
        hiring_trend_30d: hiring_30d,
        employee_growth: employee_stats.total,
        attrition_30d,
        probation_ending_soon: probation_ending_soon.value,
      },
      delivery: {
        projects_at_risk: project_dashboard.at_risk,
        projects_blocked: project_dashboard.blocked,
        upcoming_milestones_7d: upcoming_milestones.value,
        budget_overrun_risk_count: budget_overrun_count,
      },
      financial: {
        expense_trend_30d: expense_30d,
        payroll_trend_mom: { current: payroll_current.value, previous: payroll_previous.value, delta_pct: payroll_trend_pct },
        // Budget utilization has no historical snapshot to trend against —
        // budget_spent is a live cumulative total, not a period-scoped value
        // (see report_builder.controller.js's golden-rule comment on the
        // same class of gap) — documented, not faked.
        budget_utilization_trend: null,
      },
      productivity: {
        productivity_trend_7d: productivity_7d,
        monitoring_coverage_trend_7d: { current: coverage_current_pct, previous: coverage_previous_pct, delta_pct: pct_delta(coverage_current_pct ?? 0, coverage_previous_pct ?? 0) },
        attendance_late_trend_7d: attendance_7d,
      },
      service_desk: {
        ticket_volume_trend_30d: ticket_volume_30d,
        resolution_trend_30d: ticket_resolved_30d,
        // SLA breach *rate over time* would need historical snapshots of
        // overdue state (same live now()-comparison gap documented for
        // ticket_sla_overdue in get_operations_intelligence) — not tracked,
        // so a trend can't be computed honestly; current-point value only.
        sla_trend: null,
      },
    },
  };
}

// Smart Alerts (Phase 4) — reuses the exact alert counts already computed in
// get_operations_intelligence's `alerts` block; this only ranks/labels them
// by severity. No new alert source, no new notification engine.
function prioritize_alerts(alerts) {
  const items = [
    { key: 'overdue_tickets', label: 'Overdue Tickets', count: alerts.overdue_tickets, severity: alerts.overdue_tickets > 0 ? 'high' : 'none' },
    { key: 'blocked_projects', label: 'Blocked Projects', count: alerts.blocked_projects, severity: alerts.blocked_projects > 0 ? 'high' : 'none' },
    { key: 'overdue_approvals', label: 'Overdue Approvals', count: (alerts.overdue_approvals.requisitions_pending + alerts.overdue_approvals.tickets_pending + alerts.overdue_approvals.leave_pending), severity: 'medium' },
    { key: 'compliance_reminders', label: 'Compliance Reminders', count: alerts.compliance_reminders, severity: alerts.compliance_reminders > 0 ? 'medium' : 'none' },
    { key: 'probation_reminders', label: 'Probation Reminders', count: alerts.probation_reminders, severity: 'low' },
  ];
  const rank = { high: 0, medium: 1, low: 2, none: 3 };
  return items.filter((i) => i.count > 0).sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────
// Sprint 2 Milestone 3 — Executive Action Center.
//
// Every card here reuses a value already computed by operations/insights
// above, an existing service function, or one extra generic report_builder
// call — never a new bespoke query, never a new approval/assignment/
// escalation/reminder flow. `path` is the existing page each card drills
// into (Phase 3 — no new action pages). Two examples from the spec are
// deliberately NOT included, with the reason recorded rather than faked:
//   - "Departments exceeding budget": no department-level budget concept
//     exists anywhere in the schema (only per-project budget/budget_spent).
//   - "Inactive projects": no staleness/last-activity timestamp is computed
//     anywhere a project's "inactive" state could be derived from.
// ─────────────────────────────────────────────────────────────────────────

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function sort_by_priority(items) {
  // Deterministic: priority rank, then count descending, then label
  // alphabetically — never depends on object insertion order.
  return items
    .filter((i) => i.count > 0)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.count - a.count || a.label.localeCompare(b.label));
}

// The DB-dependent half of the Action Center — deliberately has NO
// dependency on operations/insights, so it can run in the same top-level
// Promise.all as everything else in get_executive_dashboard() rather than
// after it. (Originally awaited operations/insights first, which stacked an
// extra serial round-trip onto every dashboard fetch — caught during the
// Phase 6 performance audit via a live-fixture test that goes flaky when the
// overall request slows down and starts overlapping with concurrent test
// fixtures elsewhere in the suite.)
async function get_action_center_raw({ month, year }, { employee_stats }) {
  const [
    critical_tickets_pending,
    critical_tickets_in_progress,
    payroll_completed_this_period,
    checked_in_today,
    pending_asset_returns,
    active_users_detail,
    project_owner_detail,
    completed_payroll_this_period,
  ] = await Promise.all([
    compute_kpi({ entity: 'support_tickets', metric: 'COUNT', filters: { priority: 'high', status: 'pending' } }),
    compute_kpi({ entity: 'support_tickets', metric: 'COUNT', filters: { priority: 'high', status: 'in_progress' } }),
    compute_kpi({ entity: 'payroll_runs', metric: 'COUNT', filters: { period_month: +month, period_year: +year, status: 'COMPLETED' } }),
    compute_aggregate({ entity: 'timesheet_entries', group_by: 'user_id', filters: { created_at: day_bounds() } }),
    list_asset_requests({ status: 'PENDING', limit: 1 }),
    // "Employees without managers" / "missing project owners" are a
    // column-is-null check the generic filter shape can't express (build_where
    // skips null filter values by design — see report_builder.controller.js).
    // Same technique as Milestone 2's budget-overrun check: reuse the generic
    // paginated-detail path (compute_report) and do the one-line null-count
    // in JS, rather than a bespoke query.
    compute_report({ entity: 'users', columns: ['id', 'supervisor_id'], filters: { status: 'ACTIVE' }, limit: 1000 }),
    compute_report({ entity: 'projects', columns: ['id', 'owner_id', 'status'], limit: 1000 }),
    compute_kpi({ entity: 'payroll_runs', metric: 'COUNT', filters: { period_month: +month, period_year: +year, status: 'PAID' } }),
  ]);

  const TERMINAL_PROJECT_STATUSES = ['COMPLETED', 'DELIVERED', 'ARCHIVED'];
  return {
    unresolved_critical_tickets: critical_tickets_pending.value + critical_tickets_in_progress.value,
    missing_attendance_today: Math.max(0, employee_stats.total - (checked_in_today.rows?.length || 0)),
    employees_without_managers: (active_users_detail.data || []).filter((u) => !u.supervisor_id).length,
    missing_project_owners: (project_owner_detail.data || []).filter((p) => !p.owner_id && !TERMINAL_PROJECT_STATUSES.includes(p.status)).length,
    payroll_not_processed: payroll_completed_this_period.value === 0 ? 1 : 0,
    pending_asset_returns: pending_asset_returns.total,
    completed_payroll_this_period: completed_payroll_this_period.value,
  };
}

// Cheap, synchronous bucket-building — no DB calls here, everything was
// already fetched (raw, in parallel with the rest of the dashboard) or reused
// from operations/insights.
function build_action_center({ project_dashboard }, operations, insights, raw) {
  const {
    unresolved_critical_tickets, missing_attendance_today, employees_without_managers,
    missing_project_owners, payroll_not_processed, pending_asset_returns, completed_payroll_this_period,
  } = raw;

  const requires_attention = sort_by_priority([
    { key: 'overdue_approvals', label: 'Overdue Approvals', count: operations.alerts.overdue_approvals.requisitions_pending + operations.alerts.overdue_approvals.tickets_pending + operations.alerts.overdue_approvals.leave_pending, priority: 'critical', path: '/admin/approvals' },
    { key: 'blocked_projects', label: 'Blocked Projects', count: project_dashboard.blocked, priority: 'critical', path: '/admin/project-tracking' },
    { key: 'overdue_milestones', label: 'Overdue Milestones', count: project_dashboard.milestones_overdue, priority: 'high', path: '/admin/project-tracking' },
    { key: 'unresolved_critical_tickets', label: 'Unresolved Critical Tickets', count: unresolved_critical_tickets, priority: 'critical', path: '/admin/tickets' },
    { key: 'probation_ending_soon', label: 'Probation Ending Soon', count: insights.workforce.probation_ending_soon, priority: 'high', path: '/hr/employee-directory' },
    // Boolean-shaped card: 1 means "current period has no completed payroll
    // run yet", 0 means it's handled — count drives display, not a literal
    // number of missing runs (payroll runs are one-per-period).
    { key: 'payroll_not_processed', label: 'Payroll Not Processed', count: payroll_not_processed, priority: 'high', path: '/admin/payroll' },
    { key: 'missing_attendance_today', label: 'Missing Attendance Today', count: missing_attendance_today, priority: 'medium', path: '/admin/attendance' },
    { key: 'pending_asset_returns', label: 'Pending Asset Requests', count: pending_asset_returns, priority: 'medium', path: '/admin/assets' },
  ]);

  const requires_review = sort_by_priority([
    // "High expenses" — expense_trend_30d already shows spend trending up
    // sharply (>50% over the prior 30 days); reused from insights.financial,
    // not a new calculation.
    { key: 'expense_trend_high', label: 'Expenses Trending Up', count: (insights.financial.expense_trend_30d.delta_pct > 50 && insights.financial.expense_trend_30d.current > 0) ? 1 : 0, priority: 'medium', path: '/admin/expenses' },
    { key: 'employees_without_managers', label: 'Employees Without Managers', count: employees_without_managers, priority: 'medium', path: '/hr/employee-directory' },
    { key: 'missing_project_owners', label: 'Projects Missing Owners', count: missing_project_owners, priority: 'medium', path: '/admin/project-tracking' },
  ]);

  const informational = sort_by_priority([
    { key: 'new_employees', label: 'New Employees (30d)', count: insights.workforce.hiring_trend_30d.current, priority: 'low', path: '/hr/employee-directory' },
    { key: 'completed_projects', label: 'Completed Projects', count: project_dashboard.delivered, priority: 'low', path: '/admin/project-tracking' },
    { key: 'recently_resolved_tickets', label: 'Recently Resolved Tickets (30d)', count: insights.service_desk.resolution_trend_30d.current, priority: 'low', path: '/admin/tickets' },
    { key: 'completed_payroll', label: 'Completed Payroll Runs', count: completed_payroll_this_period, priority: 'low', path: '/admin/payroll' },
  ]);

  return { requires_attention, requires_review, informational };
}
