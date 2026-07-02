/**
 * CORS allowlist unit tests
 * Run with: node --test tests/security/cors.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { build_allowed_origins, is_origin_allowed, DEFAULT_ALLOWED_ORIGINS } from '../../src/shared/cors-config.js';

describe('build_allowed_origins', () => {
  it('always includes the fixed production/dev origins', () => {
    const allowed = build_allowed_origins(undefined);
    for (const origin of DEFAULT_ALLOWED_ORIGINS) {
      assert.ok(allowed.has(origin), `expected ${origin} to be allowed`);
    }
  });

  it('does not widen the allowlist when CORS_ORIGIN is "*"', () => {
    const allowed = build_allowed_origins('*');
    assert.equal(allowed.size, DEFAULT_ALLOWED_ORIGINS.length);
    assert.ok(!allowed.has('*'));
  });

  it('does not widen the allowlist when CORS_ORIGIN is unset', () => {
    const allowed = build_allowed_origins('');
    assert.equal(allowed.size, DEFAULT_ALLOWED_ORIGINS.length);
  });

  it('extends the allowlist with a comma-separated CORS_ORIGIN value', () => {
    const allowed = build_allowed_origins('https://staging.tekxai.services, https://extra.example.com');
    assert.ok(allowed.has('https://staging.tekxai.services'));
    assert.ok(allowed.has('https://extra.example.com'));
    assert.ok(allowed.has('https://tekxai.services')); // defaults still present
  });
});

describe('is_origin_allowed', () => {
  const allowed = build_allowed_origins(undefined);

  it('allows requests with no Origin header (same-origin/non-browser)', () => {
    assert.equal(is_origin_allowed(undefined, allowed), true);
    assert.equal(is_origin_allowed(null, allowed), true);
  });

  it('allows the exact production origin', () => {
    assert.equal(is_origin_allowed('https://tekxai.services', allowed), true);
  });

  it('allows the www subdomain', () => {
    assert.equal(is_origin_allowed('https://www.tekxai.services', allowed), true);
  });

  it('allows both local dev origins', () => {
    assert.equal(is_origin_allowed('http://localhost:5173', allowed), true);
    assert.equal(is_origin_allowed('http://localhost:3000', allowed), true);
  });

  it('rejects an arbitrary/attacker origin', () => {
    assert.equal(is_origin_allowed('https://evil.example.com', allowed), false);
  });

  it('rejects a look-alike origin (subdomain confusion)', () => {
    assert.equal(is_origin_allowed('https://tekxai.services.evil.com', allowed), false);
  });

  it('rejects http when only https is allowed for the production domain', () => {
    assert.equal(is_origin_allowed('http://tekxai.services', allowed), false);
  });
});
