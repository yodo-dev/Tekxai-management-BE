import { create_new_team, delete_existing_team, get_team, list_teams, update_existing_team } from '../services/teams.service.js';

export async function get_teams(req, res, next) {
  try {
    const { search, page, limit, type } = req.query;
    return res.json({ success: true, payload: await list_teams({ search, page: +page || 1, limit: +limit || 50, type }) });
  } catch (e) { return next(e); }
}

export async function get_team_by_id(req, res, next) {
  try { return res.json({ success: true, payload: await get_team(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_team_ctrl(req, res, next) {
  try { return res.status(201).json({ success: true, payload: await create_new_team(req.body) }); }
  catch (e) { return next(e); }
}

export async function update_team_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await update_existing_team(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

export async function delete_team_ctrl(req, res, next) {
  try {
    await delete_existing_team(req.params.id);
    return res.json({ success: true, message: 'Team deleted' });
  } catch (e) { return next(e); }
}
