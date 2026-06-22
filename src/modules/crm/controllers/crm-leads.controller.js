import {
  list_unified_leads, update_lead_stage, PIPELINE_STAGES,
  list_handoffs, create_handoff, update_handoff,
  list_invoices, create_invoice, update_invoice,
} from '../services/crm-leads.service.js';

// Leads
export async function leads_list_ctrl(req, res, next) {
  try {
    const { source, stage, is_hot, page, limit } = req.query;
    const result = await list_unified_leads({ user_id: req.user.id, role: req.user.roles?.[0], source, stage, is_hot, page, limit });
    res.json({ success: true, payload: result });
  } catch (e) { next(e); }
}

export async function lead_stage_ctrl(req, res, next) {
  try {
    const { source, id } = req.params;
    const { pipeline_stage } = req.body;
    const result = await update_lead_stage(source, id, pipeline_stage, req.user.id);
    res.json({ success: true, payload: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
}

export async function pipeline_meta_ctrl(_req, res) {
  res.json({ success: true, payload: { stages: PIPELINE_STAGES } });
}

// Handoffs
export async function handoffs_list_ctrl(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await list_handoffs({ user_id: req.user.id, role: req.user.roles?.[0], status, page, limit });
    res.json({ success: true, payload: result });
  } catch (e) { next(e); }
}

export async function handoff_create_ctrl(req, res, next) {
  try {
    const result = await create_handoff(req.body, req.user.id);
    res.status(201).json({ success: true, payload: result });
  } catch (e) { next(e); }
}

export async function handoff_update_ctrl(req, res, next) {
  try {
    const result = await update_handoff(req.params.id, req.body);
    res.json({ success: true, payload: result });
  } catch (e) { next(e); }
}

// Invoices
export async function invoices_list_ctrl(req, res, next) {
  try {
    const { client_account_id, status, page, limit } = req.query;
    const result = await list_invoices({ client_account_id, status, page, limit });
    res.json({ success: true, payload: result });
  } catch (e) { next(e); }
}

export async function invoice_create_ctrl(req, res, next) {
  try {
    const result = await create_invoice(req.body, req.user.id);
    res.status(201).json({ success: true, payload: result });
  } catch (e) { next(e); }
}

export async function invoice_update_ctrl(req, res, next) {
  try {
    const result = await update_invoice(req.params.id, req.body);
    res.json({ success: true, payload: result });
  } catch (e) { next(e); }
}
