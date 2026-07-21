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
import { get_depreciation_report, get_inventory_report } from '../../assets/services/assets.service.js';
import { list_escalation_history } from '../../compliance-escalation/services/compliance-escalation.service.js';
import { compute_kpi, compute_aggregate } from '../../reports/report_builder.controller.js';

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
async function get_operations_intelligence({ month, year }) {
  const now = new Date();
  const period_start = new Date(year, month - 1, 1).toISOString();
  const period_end = new Date(year, month, 1).toISOString();
  const today = day_bounds(now);

  const [
    employee_stats,
    project_dashboard,
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
    get_employee_stats_summary(),
    get_project_dashboard(),
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
  const [post_sales, company_roi, performers, operations] = await Promise.all([
    get_post_sales_dashboard(),
    get_company_roi_rollup({ month, year }),
    get_performer_rankings({ month, year }),
    get_operations_intelligence({ month, year }),
  ]);

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
  };
}
