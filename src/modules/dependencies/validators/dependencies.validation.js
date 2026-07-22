// GITHUB/SERVER/DOMAIN/SMTP/OPENAI/STRIPE/AWS are deliberately excluded —
// those are tracked exclusively by the DevOps Access module
// (git_access_status/server_access_status/domain_access_status/
// email_smtp_access_status/openai_access_status/stripe_access_status/
// aws_access_status in devops-access.validation.js). Keeping both would let
// the same access item be tracked in two places with two different
// statuses. Dependencies covers everything DevOps Access doesn't.
export const DEPENDENCY_TYPES = [
  'ANTHROPIC', 'GEMINI',
  'TWILIO', 'FIREBASE', 'SUPABASE', 'DIGITALOCEAN', 'CLOUDFLARE',
  'GOOGLE_OAUTH', 'APPLE_DEVELOPER', 'PLAY_STORE', 'META', 'SENDGRID', 'OTHER',
];
export const DEPENDENCY_STATUSES = ['NOT_STARTED', 'WAITING', 'ACTIVE', 'BLOCKED', 'COMPLETED'];

export function validate_dependency(body, { partial = false } = {}) {
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return { valid: false, message: 'name is required' };
  }
  if (!partial || body.type !== undefined) {
    if (!DEPENDENCY_TYPES.includes(body.type)) {
      return { valid: false, message: `type must be one of ${DEPENDENCY_TYPES.join(', ')}` };
    }
  }
  if (body.status !== undefined && !DEPENDENCY_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${DEPENDENCY_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
