export const LINK_TYPES = [
  'GITHUB', 'STAGING', 'PRODUCTION', 'FIGMA', 'CLICKUP', 'GOOGLE_SHEET', 'NOTION',
  'JIRA', 'GITHUB_PROJECT', 'LINEAR', 'API_DOCS', 'DOCUMENTATION', 'OTHER',
];

export function validate_create_link(body) {
  if (!body?.url?.trim()) return { valid: false, message: 'url is required' };
  if (!body?.link_type || !LINK_TYPES.includes(body.link_type)) {
    return { valid: false, message: `link_type must be one of ${LINK_TYPES.join(', ')}` };
  }
  try { new URL(body.url); } catch { return { valid: false, message: 'url must be a valid URL' }; }
  return { valid: true };
}
