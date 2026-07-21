export const DEPENDENCY_TYPES = [
  'GITHUB', 'SERVER', 'DOMAIN', 'SMTP', 'OPENAI', 'ANTHROPIC', 'GEMINI', 'STRIPE',
  'TWILIO', 'FIREBASE', 'SUPABASE', 'AWS', 'DIGITALOCEAN', 'CLOUDFLARE',
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
