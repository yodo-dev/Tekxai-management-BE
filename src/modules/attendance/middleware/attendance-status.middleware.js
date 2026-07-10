import prisma from '../../../shared/database/client.js';
import { can_clock_in, can_submit_time_off } from '../constants/attendance-status-rules.js';

function app_error(message, status_code = 403) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

// authenticate.js already fetches `users.status` once per request but does
// not forward it onto req.user, and this milestone is explicitly scoped to
// not modify authenticate.js — so this is a second, small, targeted query
// rather than a reused value. Reads `users.status` (not the mirrored
// `employee_profiles.employment_status`) since it's the cheaper of the two
// kept-in-sync copies for this call site.
async function get_requester_status(req) {
  const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { status: true } });
  return user?.status;
}

// Gates POST /timesheet/clock-in only. Clock-out and force-checkout are
// deliberately never gated by Employment Status — see
// attendance-status-rules.js for why.
export async function require_clock_in_eligible(req, res, next) {
  try {
    const status = await get_requester_status(req);
    if (!can_clock_in(status)) {
      return next(app_error(`Clock-in is not available while your employment status is ${status}.`, 403));
    }
    next();
  } catch (err) { next(err); }
}

// Gates POST /timesheet/time-off/request (submitting a NEW request only —
// approving/rejecting an existing request is untouched, out of scope this
// milestone).
export async function require_time_off_request_eligible(req, res, next) {
  try {
    const status = await get_requester_status(req);
    if (!can_submit_time_off(status)) {
      return next(app_error(`You cannot submit a new time-off request while your employment status is ${status}.`, 403));
    }
    next();
  } catch (err) { next(err); }
}
