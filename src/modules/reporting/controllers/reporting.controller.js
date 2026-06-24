import prisma from '../../../shared/database/client.js';
import { parse_csv_text, parse_xlsx_buffer, classify_all, compute_upwork_totals } from '../services/upwork.parser.js';
import multer from 'multer';

const ok = (res, payload, msg = 'OK', status = 200) => res.status(status).json({ success: true, message: msg, payload });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

export const upload_middleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export async function parse_file(req, res, next) {
  try {
    const file = req.file;
    if (!file) return fail(res, 'No file uploaded');

    let raw_rows = [];
    const name = file.originalname.toLowerCase();

    if (name.endsWith('.csv')) {
      const text = file.buffer.toString('utf-8');
      raw_rows = parse_csv_text(text);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      raw_rows = parse_xlsx_buffer(file.buffer);
    } else {
      return fail(res, 'Unsupported format. Upload .csv or .xlsx');
    }

    const classified = classify_all(raw_rows);
    const upwork_totals = compute_upwork_totals(classified);

    return ok(res, {
      rows: classified,
      upwork_totals,
      row_count: classified.length,
      file_name: file.originalname,
    });
  } catch (e) { return next(e); }
}

export async function get_internal_data(req, res, next) {
  try {
    const { from, to } = req.query;
    const result = { tekxai_expenses: 0, tekxai_salaries: 0 };

    // Tekxai-side expense total
    try {
      const where = { transaction_type: 'expense' };
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to)   where.date.lte = new Date(to);
      }
      const agg = await prisma.expense_transactions.aggregate({
        where,
        _sum: { tekxai_amount: true },
      });
      result.tekxai_expenses = parseFloat(agg._sum.tekxai_amount || 0);
    } catch (_) {}

    // Salary total from salary_builders
    try {
      const where = {};
      if (from || to) {
        if (from) {
          const fromPeriod = from.slice(0, 7);
          where.period = { gte: fromPeriod };
        }
        if (to) {
          const toPeriod = to.slice(0, 7);
          where.period = { ...where.period, lte: toPeriod };
        }
      }
      const slips = await prisma.salary_builders.findMany({ where });
      result.tekxai_salaries = slips.reduce((sum, s) => {
        return sum + parseFloat(s.basic_salary_pkr || 0) + parseFloat(s.commission_pkr || 0) - parseFloat(s.deductions_pkr || 0);
      }, 0);
    } catch (_) {}

    return ok(res, result);
  } catch (e) { return next(e); }
}

export async function save_report(req, res, next) {
  try {
    const { name, period_from, period_to, uploaded_file_name, raw_transactions, upwork_totals, manual_adjustments, salary_snapshot, expense_snapshot, final_result } = req.body;
    if (!name || !period_from || !period_to) return fail(res, 'name, period_from, period_to required');

    const report = await prisma.financial_reports.create({
      data: {
        name,
        period_from: new Date(period_from),
        period_to: new Date(period_to),
        uploaded_file_name: uploaded_file_name || null,
        raw_transactions: raw_transactions || null,
        upwork_totals: upwork_totals || null,
        manual_adjustments: manual_adjustments || null,
        salary_snapshot: salary_snapshot != null ? parseFloat(salary_snapshot) : null,
        expense_snapshot: expense_snapshot != null ? parseFloat(expense_snapshot) : null,
        final_result: final_result != null ? parseFloat(final_result) : null,
        status: 'FINAL',
        created_by: req.user.id,
      },
      include: { creator: { select: { id: true, first_name: true, last_name: true } } },
    });

    return ok(res, report, 'Report saved', 201);
  } catch (e) { return next(e); }
}

export async function list_reports(req, res, next) {
  try {
    const reports = await prisma.financial_reports.findMany({
      orderBy: { created_at: 'desc' },
      include: { creator: { select: { id: true, first_name: true, last_name: true } } },
    });
    return ok(res, { records: reports, total: reports.length });
  } catch (e) { return next(e); }
}

export async function get_report(req, res, next) {
  try {
    const report = await prisma.financial_reports.findUnique({
      where: { id: req.params.id },
      include: { creator: { select: { id: true, first_name: true, last_name: true } } },
    });
    if (!report) return fail(res, 'Report not found', 404);
    return ok(res, report);
  } catch (e) { return next(e); }
}

export async function delete_report(req, res, next) {
  try {
    await prisma.financial_reports.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Deleted');
  } catch (e) { return next(e); }
}
