import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '../../../shared/database/client.js';

const ok   = (res, p, m = 'OK', s = 200) => res.status(s).json({ success: true,  message: m, payload: p });
const fail = (res, m, s = 400)           => res.status(s).json({ success: false, message: m });

const METADATA_PATH = process.env.DOWNLOADS_DIR
  ? join(process.env.DOWNLOADS_DIR, 'latest', 'metadata.json')
  : '/home/ubuntu/downloads/latest/metadata.json';

const BASE_URL = process.env.DOWNLOADS_BASE_URL || 'https://tekxai.services/downloads/latest';

function read_metadata() {
  try {
    const raw = readFileSync(METADATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// GET /downloads/latest — public, no auth required
export async function get_latest(req, res, next) {
  try {
    const meta = read_metadata();
    if (!meta) {
      return res.status(404).json({
        success: false,
        message: 'No build available yet',
        payload: null,
      });
    }

    return ok(res, {
      version:                meta.version || null,
      buildDate:              meta.buildDate || null,
      commit:                 meta.commit || null,
      branch:                 meta.branch || null,
      author:                 meta.author || null,
      commitMessage:          meta.commitMessage || null,
      platforms:              meta.platforms || [],
      windows:                `${BASE_URL}/TekXAI-Agent-Setup.exe`,
      mac:                    `${BASE_URL}/TekXAI-Agent.dmg`,
      checksums: {
        windows:              meta.checksums?.windows || null,
        mac:                  meta.checksums?.mac || null,
      },
      releaseNotes:           meta.releaseNotes || null,
      minimumBackendVersion:  meta.minimumBackendVersion || '1.0.0',
    });
  } catch (e) {
    next(e);
  }
}

// POST /downloads/track — optional auth
export async function track_download(req, res, next) {
  try {
    const { platform, version } = req.body;
    if (!platform) return fail(res, 'platform is required');

    const ip  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
    const ua  = req.headers['user-agent'] || null;
    const uid = req.user?.id || null;

    await prisma.download_events.create({
      data: {
        platform,
        version: version || null,
        user_id: uid,
        ip_address: ip,
        user_agent: ua,
      },
    });

    return ok(res, null, 'Download tracked', 201);
  } catch (e) {
    next(e);
  }
}

// GET /downloads/stats — admin only (called with ADMIN guard from route)
export async function get_stats(req, res, next) {
  try {
    const [total, by_platform, recent] = await Promise.all([
      prisma.download_events.count(),
      prisma.download_events.groupBy({
        by: ['platform'],
        _count: { platform: true },
        orderBy: { _count: { platform: 'desc' } },
      }),
      prisma.download_events.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
      }),
    ]);

    return ok(res, { total, by_platform, recent });
  } catch (e) {
    next(e);
  }
}
