import { get_user_balances } from '../repositories/leave-balances.repository.js';

function ok(res, payload) { return res.json({ success: true, payload }); }

export async function get_my_balances(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    return ok(res, { records: await get_user_balances(req.user.id, year), year: Number(year) });
  } catch (err) { next(err); }
}

export async function get_user_balances_ctrl(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    return ok(res, { records: await get_user_balances(req.params.userId, year), year: Number(year) });
  } catch (err) { next(err); }
}
