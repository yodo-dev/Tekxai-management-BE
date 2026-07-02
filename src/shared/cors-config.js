// Pure helpers extracted from app.js so the CORS allowlist logic can be unit
// tested directly (see tests/security/cors.test.js).

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://tekxai.services',
  'https://www.tekxai.services',
  'http://localhost:5173',
  'http://localhost:3000',
];

/** Builds the allowlist: fixed defaults plus any comma-separated CORS_ORIGIN
 * extras. A CORS_ORIGIN of '*' or unset never widens the allowlist. */
export function build_allowed_origins(cors_origin_env) {
  const extras = cors_origin_env && cors_origin_env !== '*'
    ? cors_origin_env.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extras]);
}

/** No Origin header = same-origin or non-browser client (curl, server-to-server) — allow. */
export function is_origin_allowed(origin, allowed_origins) {
  return !origin || allowed_origins.has(origin);
}
