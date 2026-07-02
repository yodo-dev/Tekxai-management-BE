// Pure, DB-free validation helpers extracted from storage.routes.js so they
// can be unit tested directly (see tests/storage/upload-validation.test.js).

// Allowlist, not a blocklist — presigned URLs must never be issued for
// executables/scripts. Covers the document/image/media types this ERP
// actually uses (avatars, receipts, contracts, chat/ticket attachments).
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv', 'text/plain',
  'application/zip', 'application/x-zip-compressed',
  'audio/mpeg', 'audio/wav', 'video/mp4',
]);

const DANGEROUS_EXTENSION_RE = /\.(exe|bat|cmd|sh|ps1|msi|dll|apk|jar|com|scr|vbs|js)$/i;

export function is_mime_allowed(mime_type) {
  return ALLOWED_MIME_TYPES.has(mime_type);
}

export function is_extension_dangerous(file_name) {
  return DANGEROUS_EXTENSION_RE.test(file_name || '');
}

/** Can this user modify/confirm a file_uploads record they may not own? */
export function can_modify_file(user, file_record) {
  if (!file_record) return false;
  const is_admin = user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
  return is_admin || file_record.user_id === user.id;
}
