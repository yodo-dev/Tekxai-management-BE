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

// Team member management
export async function add_member_ctrl(req, res, next) {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    const prisma_client = (await import('../../../shared/database/client.js')).default;
    const member = await prisma_client.team_members.upsert({
      where: { team_id_user_id: { team_id: req.params.id, user_id } },
      update: { role: role || 'MEMBER' },
      create: { team_id: req.params.id, user_id, role: role || 'MEMBER' },
      include: { user: { select: { id: true, first_name: true, last_name: true, avatar: true } } },
    });
    return res.status(201).json({ success: true, message: 'Member added', payload: member });
  } catch (err) { next(err); }
}

export async function remove_member_ctrl(req, res, next) {
  try {
    const prisma_client = (await import('../../../shared/database/client.js')).default;
    await prisma_client.team_members.deleteMany({
      where: { team_id: req.params.id, user_id: req.params.userId },
    });
    return res.json({ success: true, message: 'Member removed', payload: null });
  } catch (err) { next(err); }
}

export async function list_members_ctrl(req, res, next) {
  try {
    const prisma_client = (await import('../../../shared/database/client.js')).default;
    const members = await prisma_client.team_members.findMany({
      where: { team_id: req.params.id },
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true, designation: true } } },
      orderBy: { joined_at: 'asc' },
    });
    return res.json({ success: true, payload: { records: members, total: members.length } });
  } catch (err) { next(err); }
}
