/**
 * Storage Service — S3 / Cloudflare R2 compatible
 * Falls back to local/mock URLs in development when AWS keys not set.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

const BUCKET = process.env.S3_BUCKET || 'tekxai-erp';
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT || null; // For R2: https://accountid.r2.cloudflarestorage.com

const IS_ACCELERATE = ENDPOINT?.includes('s3-accelerate');

async function get_s3_client() {
  if (!process.env.AWS_ACCESS_KEY_ID) return null;
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: REGION,
    ...(IS_ACCELERATE ? { useAccelerateEndpoint: true } : { endpoint: ENDPOINT || undefined }),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

/** Generate a presigned URL for upload (PUT) */
export async function get_presigned_upload_url(key, mime_type, expires_in = 300) {
  const s3 = await get_s3_client();
  if (!s3) {
    // Dev fallback: return placeholder
    return `http://localhost:4000/api/v1/storage/dev-upload/${encodeURIComponent(key)}`;
  }
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mime_type });
  return getSignedUrl(s3, cmd, { expiresIn: expires_in });
}

/** Generate a presigned URL for download (GET) */
export async function get_presigned_download_url(key, expires_in = 3600) {
  // A file whose upload_buffer() call failed (missing creds, or a live S3
  // error like a permission-denied bucket) falls back to local disk — check
  // that first regardless of whether an S3 client is configured, since it's
  // the authoritative signal of where the object actually landed.
  const local_path = path.join(UPLOAD_DIR, path.basename(key));
  if (fs.existsSync(local_path)) {
    return `${APP_BASE_URL}/uploads/${path.basename(key)}`;
  }

  const s3 = await get_s3_client();
  if (!s3) {
    return `${APP_BASE_URL}/api/v1/storage/dev-file/${encodeURIComponent(key)}`;
  }
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expires_in });
}

/** Delete a file */
export async function delete_file(key) {
  const s3 = await get_s3_client();
  if (!s3) return;
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Build a public URL for a key */
export function get_public_url(key) {
  // S3 Accelerate endpoint — strip trailing slash, append key
  if (ENDPOINT) return `${ENDPOINT.replace(/\/$/, '')}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/** Upload a buffer directly to S3, returns public URL */
export async function upload_buffer(key, buffer, mime_type) {
  const s3 = await get_s3_client();
  if (!s3) return null; // caller handles fallback
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: mime_type }));
  return get_public_url(key);
}
