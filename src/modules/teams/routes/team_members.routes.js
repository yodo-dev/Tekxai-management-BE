import prisma from '../../../shared/database/client.js';
import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

// GET /team/:teamId/members
router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.team_members.findMany({
      take: 500,
      where: { team_id: req.params.teamId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true, designation: true } },
      },
      orderBy: { joined_at: 'asc' },
    });
    return res.json({ success: true, payload: members });
  } catch (e) { return next(e); }
});

// POST /team/:teamId/members
router.post('/', MANAGER, async (req, res, next) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });

    const existing = await prisma.team_members.findFirst({
      where: { team_id: req.params.teamId, user_id },
    });
    if (existing) return res.status(409).json({ success: false, message: 'User already a member' });

    const member = await prisma.team_members.create({
      data: { team_id: req.params.teamId, user_id, role: role || 'MEMBER' },
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } } },
    });
    return res.status(201).json({ success: true, payload: member, message: 'Member added' });
  } catch (e) { return next(e); }
});

// PUT /team/:teamId/members/:userId — update role
router.put('/:userId', MANAGER, async (req, res, next) => {
  try {
    const member = await prisma.team_members.findFirst({
      where: { team_id: req.params.teamId, user_id: req.params.userId },
    });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const updated = await prisma.team_members.update({
      where: { id: member.id },
      data: { role: req.body.role || 'MEMBER' },
      include: { user: { select: { id: true, first_name: true, last_name: true } } },
    });
    return res.json({ success: true, payload: updated });
  } catch (e) { return next(e); }
});

// DELETE /team/:teamId/members/:userId
router.delete('/:userId', MANAGER, async (req, res, next) => {
  try {
    const member = await prisma.team_members.findFirst({
      where: { team_id: req.params.teamId, user_id: req.params.userId },
    });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    await prisma.team_members.delete({ where: { id: member.id } });
    return res.json({ success: true, message: 'Member removed' });
  } catch (e) { return next(e); }
});

export default router;
