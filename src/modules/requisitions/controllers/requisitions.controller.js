import {
  list_requisitions, get_requisition, create_requisition,
  submit_requisition, update_requisition, approve_requisition,
  update_requisition_status, update_requisition_cost, convert_requisition_to_asset,
  STATUSES, CATEGORIES, PRIORITIES,
} from '../services/requisitions.service.js';
import prisma from '../../../shared/database/client.js';

export async function list_ctrl(req, res, next) {
  try {
    const { department_id, status, category, priority, page, limit, mine } = req.query;
    const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR'];
    const role = req.user?.role_name || req.user?.role || '';
    const isAdmin = ADMIN_ROLES.includes(role);
    // Non-admins always see only their own; admins can pass ?mine=true to filter
    const requester_id = (!isAdmin || mine === 'true') ? req.user.id : undefined;
    const result = await list_requisitions({ requester_id, department_id, status, category, priority, page, limit });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try {
    const req_data = await get_requisition(req.params.id);
    if (!req_data) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, payload: req_data });
  } catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const item = await create_requisition(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: item });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    const item = await update_requisition(req.params.id, req.user.id, req.body);
    return res.json({ success: true, payload: item });
  } catch (e) { return next(e); }
}

export async function submit_ctrl(req, res, next) {
  try {
    const item = await submit_requisition(req.params.id, req.user.id);
    return res.json({ success: true, payload: item });
  } catch (e) { return next(e); }
}

export async function approve_ctrl(req, res, next) {
  try {
    const { action, comment, stage } = req.body;
    if (!['APPROVED', 'REJECTED', 'COMMENTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be APPROVED, REJECTED, or COMMENTED' });
    }
    const [, updated] = await approve_requisition(req.params.id, req.user.id, { action, comment, stage });
    return res.json({ success: true, payload: updated });
  } catch (e) { return next(e); }
}

export async function status_ctrl(req, res, next) {
  try {
    const { status, comment } = req.body;
    const updated = await update_requisition_status(req.params.id, status, req.user.id, comment);
    return res.json({ success: true, payload: updated });
  } catch (e) { return next(e); }
}

export async function convert_to_asset_ctrl(req, res, next) {
  try {
    const result = await convert_requisition_to_asset(req.params.id, req.body, req.user.id);
    return res.json({ success: true, payload: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ success: false, message: e.message });
    return next(e);
  }
}

export async function update_cost_ctrl(req, res, next) {
  try {
    const updated = await update_requisition_cost(req.params.id, req.body);
    return res.json({ success: true, payload: updated });
  } catch (e) { return next(e); }
}

export async function stats_ctrl(_req, res, next) {
  try {
    const [counts, cost_agg] = await Promise.all([
      prisma.requisitions.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.requisitions.aggregate({
        _sum: { estimated_cost: true, actual_cost: true },
      }),
    ]);
    const by_status = {};
    for (const row of counts) by_status[row.status] = row._count.id;
    return res.json({
      success: true,
      payload: {
        by_status,
        total_estimated: cost_agg._sum.estimated_cost || 0,
        total_actual: cost_agg._sum.actual_cost || 0,
      },
    });
  } catch (e) { return next(e); }
}

export async function get_meta_ctrl(_req, res, next) {
  try {
    return res.json({
      success: true,
      payload: {
        statuses: STATUSES,
        categories: CATEGORIES.map(v => ({ value: v, label: v.replace(/_/g, ' ') })),
        priorities: PRIORITIES,
      },
    });
  } catch (e) { return next(e); }
}
