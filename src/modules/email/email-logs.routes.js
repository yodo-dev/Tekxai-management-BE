import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/authenticate.js';
import prisma from '../../shared/database/client.js';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { template, status, search, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (template) where.template = template;
    if (status)   where.status   = status;
    if (search)   where.to_email = { contains: search, mode: 'insensitive' };

    const [records, total] = await Promise.all([
      prisma.email_logs.findMany({
        where, orderBy: { sent_at: 'desc' }, take: +limit, skip: +offset,
      }),
      prisma.email_logs.count({ where }),
    ]);
    return res.json({ success: true, payload: { records, total } });
  } catch (e) { next(e); }
});

export default router;
