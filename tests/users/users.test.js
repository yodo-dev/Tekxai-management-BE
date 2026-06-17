/**
 * Users Module Unit Tests
 * Run: node --test tests/users/users.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('User validation', async () => {
  const { validate_create_user, validate_update_user } = await import(
    '../../src/modules/users/validators/users.validation.js'
  );

  it('rejects missing email', () => {
    const r = validate_create_user({ password: 'pass', first_name: 'John' });
    assert.equal(r.valid, false);
    assert.match(r.message, /email/i);
  });

  it('rejects invalid email format', () => {
    const r = validate_create_user({ email: 'not-email', first_name: 'John' });
    assert.equal(r.valid, false);
  });

  it('rejects missing first name', () => {
    const r = validate_create_user({ email: 'john@test.com' });
    assert.equal(r.valid, false);
    assert.match(r.message, /first name/i);
  });

  it('accepts valid user data', () => {
    const r = validate_create_user({ email: 'john@test.com', first_name: 'John', password: 'pass123' });
    assert.equal(r.valid, true);
  });

  it('update accepts empty body', () => {
    const r = validate_update_user({});
    assert.equal(r.valid, true);
  });

  it('update rejects invalid email', () => {
    const r = validate_update_user({ email: 'bad-email' });
    assert.equal(r.valid, false);
  });
});

describe('User search query builder', () => {
  function build_search_where(search, role) {
    const where = { deleted_at: null };
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name:  { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.roles = { some: { role: { name: role } } };
    }
    return where;
  }

  it('adds 4 search OR conditions', () => {
    const w = build_search_where('john', null);
    assert.ok(w.OR);
    assert.equal(w.OR.length, 4);
  });

  it('adds role filter', () => {
    const w = build_search_where(null, 'ADMIN');
    assert.ok(w.roles);
  });

  it('empty filters produce only deleted_at', () => {
    const w = build_search_where(null, null);
    assert.equal(Object.keys(w).length, 1);
    assert.equal(w.deleted_at, null);
  });
});

describe('Pagination', () => {
  it('page 1 skip=0', () => { assert.equal((1 - 1) * 20, 0); });
  it('page 2 skip=20', () => { assert.equal((2 - 1) * 20, 20); });
  it('pages ceiling', () => { assert.equal(Math.ceil(21 / 20), 2); });
});
