import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_deal_ctrl, get_deals,
  get_salary_builder_ctrl, get_salary_history, publish_salary_ctrl, upsert_salary_ctrl,
} from '../controllers/marketing.controller.js';
import {
  get_upwork_bids, post_upwork_bid, put_upwork_bid, del_upwork_bid,
  get_linkedin_leads, post_linkedin_lead, put_linkedin_lead, del_linkedin_lead,
  get_email_leads, post_email_lead, put_email_lead, del_email_lead,
  get_linkedin_activity, post_linkedin_activity,
  get_lead_activities, post_lead_activity,
  get_won_deals,
} from '../controllers/leads.controller.js';
import { get_deposits, post_deposit, put_deposit, del_deposit, get_deposit_target_ctrl, upsert_deposit_target_ctrl } from '../controllers/deposits.controller.js';
import { get_targets, upsert_target_ctrl, get_my_report } from '../controllers/targets.controller.js';

const router = Router();
router.use(authenticate);
const MKT   = authorize('ADMIN', 'SUPER_ADMIN', 'MARKETING', 'HR');
const ADMIN = authorize('ADMIN', 'SUPER_ADMIN');

// ── Won Deals + Salary ─────────────────────────────────────────────────────
router.get('/deals',  MKT,   get_deals);
router.post('/deals', MKT, create_deal_ctrl);
router.get('/salary-builder',  MKT, get_salary_builder_ctrl);
router.post('/salary-builder', MKT, upsert_salary_ctrl);
router.post('/salary-builder/:user_id/:period/publish', ADMIN, publish_salary_ctrl);
router.get('/salary-history',  MKT, get_salary_history);

// ── Won Deals ──────────────────────────────────────────────────────────────
router.get('/won-deals', MKT, get_won_deals);

// ── Upwork Bids ───────────────────────────────────────────────────────────
router.get('/upwork',         MKT, get_upwork_bids);
router.post('/upwork',        MKT, post_upwork_bid);
router.put('/upwork/:id',     MKT, put_upwork_bid);
router.delete('/upwork/:id',  MKT, del_upwork_bid);

// ── LinkedIn Leads ─────────────────────────────────────────────────────────
router.get('/linkedin',           MKT, get_linkedin_leads);
router.post('/linkedin',          MKT, post_linkedin_lead);
router.put('/linkedin/:id',       MKT, put_linkedin_lead);
router.delete('/linkedin/:id',    MKT, del_linkedin_lead);

// ── Email Leads ────────────────────────────────────────────────────────────
router.get('/email-leads',        MKT, get_email_leads);
router.post('/email-leads',       MKT, post_email_lead);
router.put('/email-leads/:id',    MKT, put_email_lead);
router.delete('/email-leads/:id', MKT, del_email_lead);

// ── LinkedIn Activity ──────────────────────────────────────────────────────
router.get('/linkedin-activity',  MKT, get_linkedin_activity);
router.post('/linkedin-activity', MKT, post_linkedin_activity);

// ── Lead Activity Notes ────────────────────────────────────────────────────
router.get('/lead-activities',    MKT, get_lead_activities);
router.post('/lead-activities',   MKT, post_lead_activity);

// ── Deposits ───────────────────────────────────────────────────────────────
router.get('/deposits',    MKT,   get_deposits);
router.post('/deposits',   MKT, post_deposit);
router.put('/deposits/:id', MKT, put_deposit);
router.delete('/deposits/:id', MKT, del_deposit);
router.get('/deposit-target',   MKT, get_deposit_target_ctrl);
router.post('/deposit-target',  ADMIN, upsert_deposit_target_ctrl);

// ── Targets ────────────────────────────────────────────────────────────────
router.get('/targets', get_targets);
router.post('/targets', MKT, upsert_target_ctrl);

// ── Dashboard: marketing team members + salary status ─────────────────────
router.get('/members', MKT, async (req, res, next) => {
  try {
    const { default: prisma } = await import('../../../shared/database/client.js');
    const { period } = req.query;

    const users = await prisma.users.findMany({
      where: {
        roles: { some: { role: { name: { in: ['MARKETING', 'HR', 'ADMIN', 'SUPER_ADMIN'] } } } },
        deleted_at: null,
      },
      select: {
        id: true, first_name: true, last_name: true, email: true, avatar: true,
        designation: true,
        roles: { include: { role: { select: { name: true } } } },
        salary_builders: period
          ? { where: { period }, select: { id: true, period: true, status: true, basic_salary_pkr: true, commission_pkr: true, deductions_pkr: true, allowances: true, team_label: true, published_at: true } }
          : { orderBy: { created_at: 'desc' }, take: 1, select: { id: true, period: true, status: true, basic_salary_pkr: true, commission_pkr: true, deductions_pkr: true, allowances: true, team_label: true, published_at: true } },
      },
      orderBy: { first_name: 'asc' },
    });

    const slips = users.flatMap(u => u.salary_builders);
    const published = slips.filter(s => s.status === 'published');
    const summary = {
      total_members: users.length,
      published: published.length,
      drafts: slips.filter(s => s.status === 'draft').length,
      pending: users.length - slips.length,
      total_basic_pkr: published.reduce((s, r) => s + (r.basic_salary_pkr || 0), 0),
      total_commission_pkr: published.reduce((s, r) => s + (r.commission_pkr || 0), 0),
      total_deductions_pkr: published.reduce((s, r) => s + (r.deductions_pkr || 0), 0),
      total_net_pkr: published.reduce((s, r) => {
        const allowances = Array.isArray(r.allowances) ? r.allowances.reduce((a, al) => a + (al.amountPkr || 0), 0) : 0;
        return s + (r.basic_salary_pkr || 0) + (r.commission_pkr || 0) + allowances - (r.deductions_pkr || 0);
      }, 0),
    };

    return res.json({ success: true, payload: { users, summary } });
  } catch (e) { return next(e); }
});

// ── My Activity Report ─────────────────────────────────────────────────────
router.get('/my-report', get_my_report);

// ── My Salaries ────────────────────────────────────────────────────────────
router.get('/my-salaries', async (req, res, next) => {
  try {
    const { default: prisma } = await import('../../../shared/database/client.js');
    const records = await prisma.salary_builders.findMany({
      where: { user_id: req.user.id, status: 'published' },
      orderBy: { period: 'desc' },
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    });
    return res.json({ success: true, payload: records });
  } catch (e) { return next(e); }
});

export default router;
