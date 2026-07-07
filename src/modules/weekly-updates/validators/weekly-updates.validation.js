import { COMM_CHANNELS } from '../../devops-access/validators/devops-access.validation.js';

export function validate_create_update(body) {
  if (!body?.summary?.trim()) return { valid: false, message: 'summary is required' };
  if (body.method !== undefined && !COMM_CHANNELS.includes(body.method)) {
    return { valid: false, message: `method must be one of ${COMM_CHANNELS.join(', ')}` };
  }
  return { valid: true };
}
