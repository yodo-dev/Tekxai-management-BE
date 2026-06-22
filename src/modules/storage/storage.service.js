/**
 * Storage Service — S3 / Cloudflare R2 compatible
 * Falls back to local/mock URLs in development when AWS keys not set.
 */

const BUCKET = process.env.S3_BUCKET || 'tekxai-erp';
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT || null; // For R2: https://accountid.r2.cloudflarestorage.com

async function get_s3_client() {
  if (!process.env.AWS_ACCESS_KEY_ID) return null;
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: REGION,
    endpoint: ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
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
  const s3 = await get_s3_client();
  if (!s3) {
    return `http://localhost:4000/api/v1/storage/dev-file/${encodeURIComponent(key)}`;
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
  if (ENDPOINT) return `${ENDPOINT}/${BUCKET}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
