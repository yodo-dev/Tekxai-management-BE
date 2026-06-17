import { create_ticket, get_ticket, list_tickets, update_ticket_status } from '../services/tickets.service.js';

const is_admin = (req) => req.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(r));

export async function get_tickets(req, res, next) {
  try {
    const admin = is_admin(req);
    const result = await list_tickets({
      user_id: req.user.id,
      is_admin: admin,
      status: req.query.status,
      priority: req.query.priority,
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
    const ticket = await create_ticket({ ...req.body, user_id: req.user.id });
    return res.status(201).json({ success: true, payload: ticket });
  } catch (e) { return next(e); }
}

export async function update_ticket_ctrl(req, res, next) {
  try {
    const t = await update_ticket_status(req.params.id, req.body);
    return res.json({ success: true, payload: t });
  } catch (e) { return next(e); }
}
