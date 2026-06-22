import {
  list_deposits, create_deposit, update_deposit, delete_deposit,
  get_deposit_target, upsert_deposit_target,
} from '../services/deposits.service.js';

export const get_deposits = async (req, res, next) => {
  try {
    const result = await list_deposits(req.query);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const post_deposit = async (req, res, next) => {
  try {
    const record = await create_deposit(req.body, req.user.id);
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const put_deposit = async (req, res, next) => {
  try {
    const record = await update_deposit(req.params.id, req.body);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const del_deposit = async (req, res, next) => {
  try {
    await delete_deposit(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return next(e); }
};

export const get_deposit_target_ctrl = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const record = await get_deposit_target(month, year);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const upsert_deposit_target_ctrl = async (req, res, next) => {
  try {
    const { month, year, target_amount } = req.body;
    const record = await upsert_deposit_target(month, year, target_amount);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};
