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

export async function get_executive_dashboard({ month, year }) {
  const [post_sales, company_roi, performers] = await Promise.all([
    get_post_sales_dashboard(),
    get_company_roi_rollup({ month, year }),
    get_performer_rankings({ month, year }),
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
  };
}
