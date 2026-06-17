/**
 * Auth Service Unit Tests
 * Run with: node --test tests/auth/auth.service.test.js
 */
import assert from 'node:assert/strict';
import { describe, it, before, mock } from 'node:test';

// ── Mock Prisma before importing service ─────────────────────────────────────
const mockPrisma = {
  users: {
    findFirst: mock.fn(),
    findUnique: mock.fn(),
    create: mock.fn(),
    update: mock.fn(),
  },
  auth_refresh_tokens: {
    create: mock.fn(),
    findUnique: mock.fn(),
    updateMany: mock.fn(),
  },
  user_settings: {
    upsert: mock.fn(),
  },
  otp_codes: {
    create: mock.fn(),
    findFirst: mock.fn(),
    update: mock.fn(),
    updateMany: mock.fn(),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function make_user(overrides = {}) {
  return {
    id: 'usr_test_001',
    email: 'admin@tekxai.com',
    password_hash: '$2b$12$placeholder',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    status: 'ACTIVE',
    roles: [{ role: { name: 'ADMIN' } }],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Auth Service', () => {
  describe('validate_login_payload', async () => {
    const { validate_login_payload } = await import('../../src/modules/auth/validators/auth.validation.js');

    it('returns invalid for missing email', () => {
      const result = validate_login_payload({ email: '', password: 'Pass123!' });
      assert.equal(result.valid, false);
      assert.ok(result.message.toLowerCase().includes('email'));
    });

    it('returns invalid for bad email format', () => {
      const result = validate_login_payload({ email: 'not-an-email', password: 'Pass123!' });
      assert.equal(result.valid, false);
    });

    it('returns invalid for short password', () => {
      const result = validate_login_payload({ email: 'test@tekxai.com', password: '12' });
      assert.equal(result.valid, false);
    });

    it('returns valid and normalises email to lowercase', () => {
      const result = validate_login_payload({ email: 'ADMIN@tekxai.com', password: 'Password123' });
      assert.equal(result.valid, true);
      assert.equal(result.value.email, 'admin@tekxai.com');
    });

    it('accepts camelCase refreshToken in validate_refresh_payload', async () => {
      const { validate_refresh_payload } = await import('../../src/modules/auth/validators/auth.validation.js');
      const result = validate_refresh_payload({ refreshToken: 'some.jwt.token' });
      assert.equal(result.valid, true);
      assert.equal(result.value.refresh_token, 'some.jwt.token');
    });

    it('accepts snake_case refresh_token in validate_refresh_payload', async () => {
      const { validate_refresh_payload } = await import('../../src/modules/auth/validators/auth.validation.js');
      const result = validate_refresh_payload({ refresh_token: 'some.jwt.token' });
      assert.equal(result.valid, true);
    });
  });

  describe('OTP validation', async () => {
    const { validate_otp_payload } = await import('../../src/modules/auth/validators/auth.validation.js');

    it('rejects OTP that is not 4 digits', () => {
      assert.equal(validate_otp_payload({ otp: '123' }).valid, false);
      assert.equal(validate_otp_payload({ otp: '12345' }).valid, false);
      assert.equal(validate_otp_payload({ otp: 'abcd' }).valid, false);
    });

    it('accepts valid 4-digit OTP', () => {
      assert.equal(validate_otp_payload({ otp: '1234' }).valid, true);
    });
  });

  describe('Role constants', async () => {
    const { ROLE_NAMES, ROLE_LEVELS } = await import('../../src/modules/admin/constants/roles.constants.js');

    it('defines all required roles', () => {
      const required = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE', 'MARKETING', 'DIVISION_MANAGER'];
      for (const role of required) {
        assert.ok(ROLE_NAMES[role], `Missing role: ${role}`);
      }
    });

    it('SUPER_ADMIN has highest level', () => {
      assert.ok(ROLE_LEVELS.SUPER_ADMIN > ROLE_LEVELS.ADMIN);
      assert.ok(ROLE_LEVELS.ADMIN > ROLE_LEVELS.EMPLOYEE);
    });
  });

  describe('AUTH_ALLOWED_ROLES', async () => {
    const { AUTH_ALLOWED_ROLES } = await import('../../src/modules/auth/constants/auth.constants.js');

    it('includes all six roles', () => {
      assert.ok(AUTH_ALLOWED_ROLES.includes('SUPER_ADMIN'));
      assert.ok(AUTH_ALLOWED_ROLES.includes('ADMIN'));
      assert.ok(AUTH_ALLOWED_ROLES.includes('HR'));
      assert.ok(AUTH_ALLOWED_ROLES.includes('EMPLOYEE'));
      assert.ok(AUTH_ALLOWED_ROLES.includes('MARKETING'));
      assert.ok(AUTH_ALLOWED_ROLES.includes('DIVISION_MANAGER'));
    });
  });
});
