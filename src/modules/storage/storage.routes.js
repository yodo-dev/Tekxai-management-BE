import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/authenticate.js';
import prisma from '../../shared/database/client.js';
import { get_presigned_upload_url, get_presigned_download_url, delete_file } from './storage.service.js';
import { randomBytes } from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const disk_storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${randomBytes(8).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage: disk_storage, limits: { fileSize: 20 * 1024 * 1024 } });

function gen_key(entity_type, user_id, file_name) {
  const ext = file_name.split('.').pop() || 'bin';
  const rand = randomBytes(8).toString('hex');
  return `${entity_type || 'uploads'}/${user_id}/${Date.now()}_${rand}.${ext}`;
}

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

// POST /storage/upload — direct multer upload (no S3 required)
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const host = `${req.protocol}://${req.get('host')}`;
    const file_url = `${host}/uploads/${req.file.filename}`;
    return res.json({ success: true, payload: { file_url, file_name: req.file.originalname, file_size: req.file.size, mime_type: req.file.mimetype } });
  } catch (e) { next(e); }
});

// POST /storage/presign — request presigned upload URL
router.post('/presign', async (req, res, next) => {
  try {
    const { file_name, mime_type, entity_type, entity_id } = req.body;
    if (!file_name || !mime_type) {
      return res.status(400).json({ success: false, message: 'file_name and mime_type required' });
    }
    const key = gen_key(entity_type, req.user.id, file_name);
    const upload_url = await get_presigned_upload_url(key, mime_type);
    const record = await prisma.file_uploads.create({
      data: {
        user_id: req.user.id,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        file_key: key,
        file_name,
        file_size: 0,
        mime_type,
      },
    });
    return res.json({ success: true, payload: { upload_url, file_key: key, file_id: record.id } });
  } catch (err) { next(err); }
});

// PATCH /storage/:fileId/confirm — confirm upload complete + update size
router.patch('/:fileId/confirm', async (req, res, next) => {
  try {
    const { file_size } = req.body;
    const record = await prisma.file_uploads.update({
      where: { id: req.params.fileId },
      data: { file_size: Number(file_size) || 0 },
    });
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

// GET /storage/download/:fileKey — get download URL
router.get('/download/:fileKey', async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.fileKey);
    const url = await get_presigned_download_url(key);
    return res.json({ success: true, payload: { url, expires_in: 3600 } });
  } catch (err) { next(err); }
});

// GET /storage/files?entity_type=&entity_id=&user_id=
router.get('/files', async (req, res, next) => {
  try {
    const is_admin = req.user.roles.some(r => ['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r));
    const where = {};
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id)   where.entity_id   = req.query.entity_id;
    if (req.query.user_id && is_admin) where.user_id = req.query.user_id;
    else if (!is_admin)                where.user_id = req.user.id;
    const files = await prisma.file_uploads.findMany({ where, orderBy: { created_at: 'desc' } });
    return res.json({ success: true, payload: { records: files, total: files.length } });
  } catch (err) { next(err); }
});

// DELETE /storage/:fileKey
router.delete('/:fileKey', async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.fileKey);
    const record = await prisma.file_uploads.findFirst({ where: { file_key: key } });
    if (!record) return res.status(404).json({ success: false, message: 'File not found' });
    const is_admin = req.user.roles.some(r => ['ADMIN','SUPER_ADMIN'].includes(r));
    if (!is_admin && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await prisma.file_uploads.deleteMany({ where: { file_key: key } });
    await delete_file(key).catch(() => {});
    return res.json({ success: true, message: 'File deleted', payload: null });
  } catch (err) { next(err); }
});

export default router;
