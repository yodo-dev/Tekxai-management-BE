import {
  create_business_activity,
  delete_business_activity,
  get_business_activity,
  list_business_activities,
  update_business_activity,
} from '../services/business-activities.service.js';
import { validate_business_activity } from '../validators/business-activities.validation.js';

export async function get_business_activities_ctrl(req, res, next) {
  try {
    const { search, feeds_layer, active_only } = req.query;
    return res.json({ success: true, payload: await list_business_activities({ search, feeds_layer, active_only }) });
  } catch (e) { return next(e); }
}

export async function get_business_activity_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_business_activity(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_business_activity_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_business_activity(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_business_activity(req.body) });
  } catch (e) { return next(e); }
}

export async function update_business_activity_ctrl(req, res, next) {
  try {
    if (req.body?.name !== undefined || req.body?.feeds_layer !== undefined) {
      const { valid, message } = validate_business_activity({ name: req.body.name ?? 'placeholder', ...req.body });
      if (!valid) return res.status(400).json({ success: false, message });
    }
    return res.json({ success: true, payload: await update_business_activity(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_business_activity_ctrl(req, res, next) {
  try {
    await delete_business_activity(req.params.id);
    return res.json({ success: true, message: 'Business Activity deactivated' });
  } catch (e) { return next(e); }
}
