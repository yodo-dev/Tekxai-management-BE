import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/authenticate.js';
import prisma from '../../shared/database/client.js';
import { get_presigned_upload_url, get_presigned_download_url, delete_file, upload_buffer, get_public_url, UPLOAD_DIR } from './storage.service.js';
import { randomBytes } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { is_mime_allowed, is_extension_dangerous, can_modify_file } from './upload-validation.js';

// UPLOAD_DIR is imported from storage.service.js (single source of truth) —
// this used to be recomputed here with one extra '../', pointing one
// directory above the repo root instead of be-work/uploads. app.js's
// `express.static` mount and storage.service.js's delete/lookup logic both
// use be-work/uploads, so every locally-saved file was written to a
// directory nothing else ever read from or cleaned up: uploads 404ed
// immediately on their own returned file_url, and were never deleted.
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function gen_key(entity_type, user_id, file_name) {
  const ext = file_name.split('.').pop() || 'bin';
  const rand = randomBytes(8).toString('hex');
  return `${entity_type || 'uploads'}/${user_id}/${Date.now()}_${rand}.${ext}`;
}

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /storage/upload:
 *   post:
 *     summary: Upload a file (multipart, S3 or local fallback)
 *     tags: [Storage]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 payload:
 *                   type: object
 *                   properties:
 *                     file_url: { type: string }
 *                     file_key: { type: string }
 *                     file_name: { type: string }
 *                     file_size: { type: integer }
 *                     mime_type: { type: string }
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    // Production readiness audit fix: this direct-upload path previously did
    // no MIME/extension validation at all, unlike /storage/presign — any file
    // type (including ones on the dangerous-extension blocklist) could be
    // written to disk/S3 and served back with a public URL. Apply the same
    // checks presign already enforces.
    if (!is_mime_allowed(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: `File type not allowed: ${req.file.mimetype}` });
    }
    if (is_extension_dangerous(req.file.originalname)) {
      return res.status(400).json({ success: false, message: 'File extension not allowed' });
    }
    const ext  = path.extname(req.file.originalname);
    const key  = `uploads/${req.user.id}/${Date.now()}_${randomBytes(8).toString('hex')}${ext}`;

    let file_url = await upload_buffer(key, req.file.buffer, req.file.mimetype);

    if (!file_url) {
      const filename = path.basename(key);
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
      file_url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    }

    // This is the direct-upload path every real feature (Employee Documents,
    // Project Documents, HR Documents, avatars) actually uses — /presign is
    // unused by any caller. Without a file_uploads row, DELETE /storage/:fileKey
    // 404ed for every file uploaded this way (it only looked up rows created
    // by /presign), leaving deletes silently unable to remove the underlying
    // object and orphaning it in S3/disk forever.
    await prisma.file_uploads.create({
      data: {
        user_id: req.user.id,
        entity_type: req.body?.entity_type || null,
        entity_id: req.body?.entity_id || null,
        file_key: key,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
    }).catch(() => {});

    return res.json({ success: true, payload: { file_url, file_key: key, file_name: req.file.originalname, file_size: req.file.size, mime_type: req.file.mimetype } });
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /storage/presign:
 *   post:
 *     summary: Request a presigned S3 upload URL
 *     tags: [Storage]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file_name, mime_type]
 *             properties:
 *               file_name: { type: string }
 *               mime_type: { type: string }
 *               entity_type: { type: string }
 *               entity_id: { type: string }
 *     responses:
 *       200:
 *         description: Presigned upload URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payload:
 *                   type: object
 *                   properties:
 *                     upload_url: { type: string }
 *                     file_key: { type: string }
 *                     file_id: { type: string }
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/presign', async (req, res, next) => {
  try {
    const { file_name, mime_type, entity_type, entity_id } = req.body;
    if (!file_name || !mime_type) {
      return res.status(400).json({ success: false, message: 'file_name and mime_type required' });
    }
    if (!is_mime_allowed(mime_type)) {
      return res.status(400).json({ success: false, message: `File type not allowed: ${mime_type}` });
    }
    if (is_extension_dangerous(file_name)) {
      return res.status(400).json({ success: false, message: 'File extension not allowed' });
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

/**
 * @swagger
 * /storage/{fileId}/confirm:
 *   patch:
 *     summary: Confirm upload complete and update file size
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               file_size: { type: integer }
 *     responses:
 *       200:
 *         description: Upload confirmed
 *       401:
 *         description: Unauthorized
 */
router.patch('/:fileId/confirm', async (req, res, next) => {
  try {
    const existing = await prisma.file_uploads.findUnique({ where: { id: req.params.fileId } });
    if (!existing) return res.status(404).json({ success: false, message: 'File not found' });
    if (!can_modify_file(req.user, existing)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { file_size } = req.body;
    const record = await prisma.file_uploads.update({
      where: { id: req.params.fileId },
      data: { file_size: Number(file_size) || 0 },
    });
    return res.json({ success: true, payload: record });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /storage/download/{fileKey}:
 *   get:
 *     summary: Get a presigned download URL for a file
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema: { type: string }
 *         description: URL-encoded file key
 *     responses:
 *       200:
 *         description: Download URL (expires in 3600s)
 *       401:
 *         description: Unauthorized
 */
router.get('/download/:fileKey', async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.fileKey);
    const url = await get_presigned_download_url(key);
    return res.json({ success: true, payload: { url, expires_in: 3600 } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /storage/files:
 *   get:
 *     summary: List uploaded files
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: entity_type
 *         schema: { type: string }
 *       - in: query
 *         name: entity_id
 *         schema: { type: string }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *         description: Admin only
 *     responses:
 *       200:
 *         description: Files list
 *       401:
 *         description: Unauthorized
 */
router.get('/files', async (req, res, next) => {
  try {
    const is_admin = req.user.roles.some(r => ['ADMIN','SUPER_ADMIN','HR','DIVISION_MANAGER'].includes(r));
    const where = {};
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id)   where.entity_id   = req.query.entity_id;
    if (req.query.user_id && is_admin) where.user_id = req.query.user_id;
    else if (!is_admin)                where.user_id = req.user.id;
    const files = await prisma.file_uploads.findMany({
  take: 500, where, orderBy: { created_at: 'desc' } });
    return res.json({ success: true, payload: { records: files, total: files.length } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /storage/{fileKey}:
 *   delete:
 *     summary: Delete a file from storage
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema: { type: string }
 *         description: URL-encoded file key
 *     responses:
 *       200:
 *         description: File deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
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
