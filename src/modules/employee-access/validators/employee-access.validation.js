// Employee-level access tracking — distinct from Project Master's
// project-scoped devops_access_tracking/project_dependencies. Never merge
// the platform lists: this one tracks a PERSON's access to company/vendor
// platforms, not a PROJECT's third-party dependencies.
export const ACCESS_PLATFORMS = [
  'GITHUB', 'GITLAB', 'BITBUCKET', 'SLACK', 'MICROSOFT_365', 'GOOGLE_WORKSPACE',
  'VPN', 'AWS', 'AZURE', 'DIGITALOCEAN', 'OPENAI', 'CLAUDE', 'SMTP', 'DATABASE',
  'JIRA', 'CLICKUP', 'FIGMA', 'HUBSTAFF', 'OTHER',
];
export const ACCESS_STATUSES = ['ACTIVE', 'REVOKED', 'PENDING'];

export function validate_access_item(body, { partial = false } = {}) {
  if (!partial || body.platform !== undefined) {
    if (!ACCESS_PLATFORMS.includes(body.platform)) {
      return { valid: false, message: `platform must be one of ${ACCESS_PLATFORMS.join(', ')}` };
    }
  }
  if (body.status !== undefined && !ACCESS_STATUSES.includes(body.status)) {
    return { valid: false, message: `status must be one of ${ACCESS_STATUSES.join(', ')}` };
  }
  return { valid: true };
}
