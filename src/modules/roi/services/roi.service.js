// Enterprise Performance Platform — ROI Engine (Phase 3, Milestone 6).
// ROI is explicitly one KPI computed FROM the Performance Engine's output
// (§11.3) — this module deliberately contains no revenue/cost/work calculation
// of its own; it only composes numbers Phase 2 already computed. Reusing, not
// duplicating, per the roadmap's own note.
// See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.1, §11.5.
import {
  get_client_performance,
  get_employee_performance,
  get_project_performance,
} from '../../enterprise-performance/services/enterprise-performance.service.js';

// cost === 0 with revenue > 0 is a genuinely undefined ratio (division by zero),
// not "infinite ROI" — surfaced as `null` with an explicit reason rather than a
// misleading number, so a UI can render "No cost data" instead of "∞%".
function compute_roi(revenue_amount, cost) {
  if (cost > 0) {
    const roi = revenue_amount / cost;
    return { roi: Math.round(roi * 1000) / 1000, roi_percent: Math.round(roi * 100 * 10) / 10, basis: 'revenue_over_cost' };
  }
  if (revenue_amount > 0) return { roi: null, roi_percent: null, basis: 'cost_data_unavailable' };
  return { roi: null, roi_percent: null, basis: 'no_activity' };
}

export async function get_employee_roi(user_id, period) {
  const perf = await get_employee_performance(user_id, period);
  return { ...perf, ...compute_roi(perf.revenue.attributed_amount, perf.cost) };
}

export async function get_project_roi(project_id, period) {
  const perf = await get_project_performance(project_id, period);
  return { ...perf, ...compute_roi(perf.revenue, perf.cost) };
}

export async function get_client_roi(client_account_id, period) {
  const perf = await get_client_performance(client_account_id, period);
  return { ...perf, ...compute_roi(perf.revenue, perf.cost) };
}
