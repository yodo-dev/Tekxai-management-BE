import {
  create_escalation_policy,
  delete_escalation_policy,
  get_escalation_policy,
  list_escalation_history,
  list_escalation_policies,
  run_compliance_escalation,
  update_escalation_policy,
} from '../services/compliance-escalation.service.js';
import { validate_escalation_policy } from '../validators/compliance-escalation.validation.js';

export async function list_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await list_escalation_policies() }); }
  catch (e) { return next(e); }
}

export async function get_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_escalation_policy(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_escalation_policy(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    const policy = await create_escalation_policy(req.user.id, req.body);
    return res.status(201).json({ success: true, payload: policy });
  } catch (e) { return next(e); }
}

export async function update_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_escalation_policy(req.body, { partial: true });
    if (!valid) return res.status(400).json({ success: false, message });
    const policy = await update_escalation_policy(req.user.id, req.params.id, req.body);
    return res.json({ success: true, payload: policy });
  } catch (e) { return next(e); }
}

export async function delete_ctrl(req, res, next) {
  try {
    await delete_escalation_policy(req.user.id, req.params.id);
    return res.json({ success: true, message: 'Escalation policy deleted' });
  } catch (e) { return next(e); }
}

export async function history_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await list_escalation_history(req.query) }); }
  catch (e) { return next(e); }
}

export async function run_now_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await run_compliance_escalation() }); }
  catch (e) { return next(e); }
}
