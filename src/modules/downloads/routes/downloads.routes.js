import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { get_latest, get_stats, track_download } from '../controllers/downloads.controller.js';

const router = Router();

const ADMIN = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

// Public: no authenticate middleware
router.get('/latest', get_latest);

// Optional auth: attach user if token present, but don't block if missing
router.post('/track', (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    return authenticate(req, res, () => next());
  }
  next();
}, track_download);

// Admin only
router.get('/stats', authenticate, ADMIN, get_stats);

export default router;
