import { get_crm_dashboard, get_team_hierarchy, assign_supervisor } from '../services/crm-dashboard.service.js';

export async function crm_dashboard_ctrl(req, res) {
  try {
    const data = await get_crm_dashboard(req.user.id, req.user.roles?.[0]);
    res.json(data);
  } catch (err) {
    console.error('crm_dashboard error', err);
    res.status(500).json({ message: 'Failed to load CRM dashboard' });
  }
}

export async function team_hierarchy_ctrl(req, res) {
  try {
    const data = await get_team_hierarchy(req.user.id, req.user.roles?.[0]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load team hierarchy' });
  }
}

export async function assign_supervisor_ctrl(req, res) {
  try {
    const { userId } = req.params;
    const { supervisor_id } = req.body;
    const result = await assign_supervisor(userId, supervisor_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign supervisor' });
  }
}
