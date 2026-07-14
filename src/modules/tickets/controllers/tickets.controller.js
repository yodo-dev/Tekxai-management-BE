import {
  add_ticket_attachment,
  add_ticket_reply,
  create_ticket,
  get_ticket,
  get_ticket_approvals,
  get_ticket_stats,
  list_tickets,
  record_ticket_approval,
  update_ticket,
} from '../services/tickets.service.js';
import { validate_ticket } from '../validators/tickets.validation.js';

const is_admin = (req) => req.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(r));

export async function get_tickets(req, res, next) {
  try {
    const admin = is_admin(req);
    const result = await list_tickets({
      user_id: req.user.id,
      is_admin: admin,
      status: req.query.status,
      priority: req.query.priority,
      category_id: req.query.category_id,
      ticket_type_id: req.query.ticket_type_id,
      department_id: req.query.department_id,
      assignee_id: req.query.assignee_id,
      team_id: req.query.team_id,
      project_id: req.query.project_id,
      asset_id: req.query.asset_id,
      severity: req.query.severity,
      approval_status: req.query.approval_status,
      sla: req.query.sla,
      page: +req.query.page || 1,
      limit: +req.query.limit || 20,
    });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_ticket_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_ticket(req.params.id, req.user.id, is_admin(req)) });
  } catch (e) { return next(e); }
}

export async function create_ticket_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_ticket(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    const ticket = await create_ticket({ ...req.body, user_id: req.user.id, is_admin: is_admin(req) });
    return res.status(201).json({ success: true, payload: ticket });
  } catch (e) { return next(e); }
}

export async function update_ticket_ctrl(req, res, next) {
  try {
    const t = await update_ticket(req.params.id, req.user.id, req.body);
    return res.json({ success: true, payload: t });
  } catch (e) { return next(e); }
}

export async function add_attachment_ctrl(req, res, next) {
  try {
    const att = await add_ticket_attachment(req.params.id, req.user.id, is_admin(req), req.body);
    return res.status(201).json({ success: true, payload: att });
  } catch (e) { return next(e); }
}

export async function add_reply_ctrl(req, res, next) {
  try {
    const reply = await add_ticket_reply(req.params.id, req.user.id, is_admin(req), req.body);
    return res.status(201).json({ success: true, payload: reply });
  } catch (e) { return next(e); }
}

export async function stats_ctrl(_req, res, next) {
  try {
    return res.json({ success: true, payload: await get_ticket_stats() });
  } catch (e) { return next(e); }
}

export async function approve_ctrl(req, res, next) {
  try {
    const result = await record_ticket_approval(req.params.id, req.user.id, req.body);
    return res.status(201).json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_approvals_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_ticket_approvals(req.params.id) });
  } catch (e) { return next(e); }
}
