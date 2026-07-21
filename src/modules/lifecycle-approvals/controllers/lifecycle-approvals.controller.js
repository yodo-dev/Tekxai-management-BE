import { list_lifecycle_approvals, reject_lifecycle_approval } from '../services/lifecycle-approvals.service.js';
import { approve_lifecycle_transition } from '../../hr-profile/services/employee-lifecycle.service.js';

function ok(res, payload, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, payload });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

export async function list_approvals_ctrl(req, res, next) {
  try {
    const { status, user_id, page, limit } = req.query;
    const result = await list_lifecycle_approvals({ status, user_id, page, limit });
    return ok(res, result);
  } catch (err) { next(err); }
}

export async function approve_approval_ctrl(req, res, next) {
  try {
    const result = await approve_lifecycle_transition(req.params.id, req.user.id, req.body?.decision_note);
    return ok(res, result, 'Approval granted and transition applied');
  } catch (err) { next(err); }
}

export async function reject_approval_ctrl(req, res, next) {
  try {
    const result = await reject_lifecycle_approval(req.params.id, req.user.id, req.body?.decision_note);
    return ok(res, result, 'Approval rejected');
  } catch (err) { next(err); }
}
