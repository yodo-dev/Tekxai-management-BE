import { create_team, delete_team, find_team_by_id, find_teams, update_team } from '../repositories/teams.repository.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export const list_teams = (p) => find_teams(p);

export async function get_team(id) {
  const t = await find_team_by_id(id);
  if (!t) throw app_error('Team not found', 404);
  return t;
}

export const create_new_team = (d) => create_team(d);

export async function update_existing_team(id, d) {
  await get_team(id);
  return update_team(id, d);
}

export async function delete_existing_team(id) {
  await get_team(id);
  return delete_team(id);
}
