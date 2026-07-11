import {
  create_business_unit_rule,
  delete_business_unit_rule,
  get_business_unit_rule,
  get_business_unit_rule_by_unit,
  list_business_unit_rules,
  update_business_unit_rule,
} from '../services/business-unit-rules.service.js';
import { validate_business_unit_rule } from '../validators/business-unit-rules.validation.js';

export async function get_business_unit_rules_ctrl(req, res, next) {
  try {
    const { active_only } = req.query;
    return res.json({ success: true, payload: await list_business_unit_rules({ active_only }) });
  } catch (e) { return next(e); }
}

export async function get_business_unit_rule_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_business_unit_rule(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function get_business_unit_rule_by_unit_ctrl(req, res, next) {
  try { return res.json({ success: true, payload: await get_business_unit_rule_by_unit(req.params.unit) }); }
  catch (e) { return next(e); }
}

export async function create_business_unit_rule_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_business_unit_rule(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_business_unit_rule(req.body) });
  } catch (e) { return next(e); }
}

export async function update_business_unit_rule_ctrl(req, res, next) {
  try {
    if (req.body?.default_allocation_method !== undefined || req.body?.revenue_source_type !== undefined) {
      const { valid, message } = validate_business_unit_rule({ business_unit: 'placeholder', ...req.body });
      if (!valid) return res.status(400).json({ success: false, message });
    }
    return res.json({ success: true, payload: await update_business_unit_rule(req.params.id, req.body) });
  } catch (e) { return next(e); }
}

export async function delete_business_unit_rule_ctrl(req, res, next) {
  try {
    await delete_business_unit_rule(req.params.id);
    return res.json({ success: true, message: 'Business Unit rule deactivated' });
  } catch (e) { return next(e); }
}
