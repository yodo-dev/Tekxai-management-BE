import {
  list_upwork_bids, create_upwork_bid, update_upwork_bid, delete_upwork_bid,
  list_linkedin_leads, create_linkedin_lead, update_linkedin_lead, delete_linkedin_lead,
  list_email_leads, create_email_lead, update_email_lead, delete_email_lead,
  list_linkedin_activity, create_linkedin_activity,
  list_lead_activities, create_lead_activity,
  list_won_deals,
} from '../services/leads.service.js';

const isAdmin = (req) => ['ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR'].includes(req.user?.role_name);

// ── Upwork ─────────────────────────────────────────────────────────────────
export const get_upwork_bids = async (req, res, next) => {
  try {
    const { status, user_id, page, limit } = req.query;
    const uid = isAdmin(req) ? (user_id || undefined) : req.user.id;
    const result = await list_upwork_bids({ user_id: uid, status, page, limit, is_admin: isAdmin(req) });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const post_upwork_bid = async (req, res, next) => {
  try {
    const record = await create_upwork_bid({ ...req.body, user_id: req.body.user_id || req.user.id });
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const put_upwork_bid = async (req, res, next) => {
  try {
    const record = await update_upwork_bid(req.params.id, req.body);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const del_upwork_bid = async (req, res, next) => {
  try {
    await delete_upwork_bid(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return next(e); }
};

// ── LinkedIn Leads ─────────────────────────────────────────────────────────
export const get_linkedin_leads = async (req, res, next) => {
  try {
    const { status, user_id, page, limit } = req.query;
    const uid = isAdmin(req) ? (user_id || undefined) : req.user.id;
    const result = await list_linkedin_leads({ user_id: uid, status, page, limit, is_admin: isAdmin(req) });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const post_linkedin_lead = async (req, res, next) => {
  try {
    const record = await create_linkedin_lead({ ...req.body, user_id: req.body.user_id || req.user.id });
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const put_linkedin_lead = async (req, res, next) => {
  try {
    const record = await update_linkedin_lead(req.params.id, req.body);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const del_linkedin_lead = async (req, res, next) => {
  try {
    await delete_linkedin_lead(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return next(e); }
};

// ── Email Leads ────────────────────────────────────────────────────────────
export const get_email_leads = async (req, res, next) => {
  try {
    const { status, user_id, page, limit } = req.query;
    const uid = isAdmin(req) ? (user_id || undefined) : req.user.id;
    const result = await list_email_leads({ user_id: uid, status, page, limit, is_admin: isAdmin(req) });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const post_email_lead = async (req, res, next) => {
  try {
    const record = await create_email_lead({ ...req.body, user_id: req.body.user_id || req.user.id });
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const put_email_lead = async (req, res, next) => {
  try {
    const record = await update_email_lead(req.params.id, req.body);
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

export const del_email_lead = async (req, res, next) => {
  try {
    await delete_email_lead(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return next(e); }
};

// ── LinkedIn Activity ──────────────────────────────────────────────────────
export const get_linkedin_activity = async (req, res, next) => {
  try {
    const uid = isAdmin(req) ? req.query.user_id : req.user.id;
    const result = await list_linkedin_activity({ user_id: uid, page: req.query.page, limit: req.query.limit });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};

export const post_linkedin_activity = async (req, res, next) => {
  try {
    const record = await create_linkedin_activity({ ...req.body, user_id: req.body.user_id || req.user.id });
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

// ── Lead Activities ────────────────────────────────────────────────────────
export const get_lead_activities = async (req, res, next) => {
  try {
    const { lead_id, lead_source } = req.query;
    const records = await list_lead_activities(lead_id, lead_source);
    return res.json({ success: true, payload: records });
  } catch (e) { return next(e); }
};

export const post_lead_activity = async (req, res, next) => {
  try {
    const record = await create_lead_activity({
      ...req.body,
      author_id: req.user.id,
      author_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
    });
    return res.status(201).json({ success: true, payload: record });
  } catch (e) { return next(e); }
};

// ── Won Deals ──────────────────────────────────────────────────────────────
export const get_won_deals = async (req, res, next) => {
  try {
    const { user_id, source, page, limit, from, to } = req.query;
    const uid = isAdmin(req) ? user_id : req.user.id;
    const result = await list_won_deals({ user_id: uid, source, page, limit, from, to });
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
};
