import { randomBytes } from 'crypto';
export function nanoid(size = 21) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(size);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}
