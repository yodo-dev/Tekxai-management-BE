import {
  bulk_delete_business_units,
  create_business_unit,
  delete_business_unit,
  get_business_unit,
  list_business_units,
  update_business_unit,
} from '../services/business-units.service.js';
import { validate_business_unit } from '../validators/business-units.validation.js';

export async function get_business_units(req, res, next) {
  try {
    return res.json({ success: true, payload: await list_business_units(req.query) });
  } catch (e) { return next(e); }
}

export async function get_bu(req, res, next) {
  try { return res.json({ success: true, payload: await get_business_unit(req.params.id) }); }
  catch (e) { return next(e); }
}

export async function create_bu(req, res, next) {
  try {
    const { valid, message } = validate_business_unit(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    return res.status(201).json({ success: true, payload: await create_business_unit(req.body) });
  } catch (e) { return next(e); }
}

export async function update_bu(req, res, next) {
  try { return res.json({ success: true, payload: await update_business_unit(req.params.id, req.body) }); }
  catch (e) { return next(e); }
}

export async function delete_bu(req, res, next) {
  try { await delete_business_unit(req.params.id); return res.json({ success: true, message: 'Deleted' }); }
  catch (e) { return next(e); }
}

export async function bulk_delete_bus(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const results = await bulk_delete_business_units(ids);
    const succeeded = results.filter(r => r.success).length;
    return res.json({ success: true, message: `${succeeded} of ${ids.length} business unit(s) deleted`, payload: { results } });
  } catch (e) { return next(e); }
}
