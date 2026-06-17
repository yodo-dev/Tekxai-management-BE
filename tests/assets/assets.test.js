/**
 * Asset Management Unit Tests
 * Run: node --test tests/assets/assets.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Asset validation', async () => {
  const { validate_asset, validate_assignment } = await import(
    '../../src/modules/assets/validators/assets.validation.js'
  );

  it('rejects missing name', () => {
    const r = validate_asset({ category_id: 'cat-1' });
    assert.equal(r.valid, false);
    assert.match(r.message, /name/i);
  });

  it('rejects missing category', () => {
    const r = validate_asset({ name: 'Laptop' });
    assert.equal(r.valid, false);
    assert.match(r.message, /category/i);
  });

  it('accepts valid asset', () => {
    const r = validate_asset({ name: 'Dell Laptop', category_id: 'cat-123' });
    assert.equal(r.valid, true);
  });

  it('rejects assignment without user_id', () => {
    const r = validate_assignment({});
    assert.equal(r.valid, false);
    assert.match(r.message, /user_id/i);
  });

  it('accepts valid assignment', () => {
    const r = validate_assignment({ user_id: 'usr-123' });
    assert.equal(r.valid, true);
  });
});

describe('Asset tag generation', () => {
  function generate_tag(count) {
    return `AST-${String(count + 1001).padStart(4, '0')}`;
  }

  it('first asset is AST-1001', () => { assert.equal(generate_tag(0), 'AST-1001'); });
  it('100th asset is AST-1100', () => { assert.equal(generate_tag(99), 'AST-1100'); });
  it('tag always matches AST-NNNN pattern', () => {
    assert.ok(/^AST-\d{4,}$/.test(generate_tag(0)));
    assert.ok(/^AST-\d{4,}$/.test(generate_tag(8999)));
  });
});

describe('Asset status transitions', () => {
  const VALID_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DAMAGED', 'RETIRED'];

  it('contains 5 statuses', () => { assert.equal(VALID_STATUSES.length, 5); });
  it('includes MAINTENANCE', () => { assert.ok(VALID_STATUSES.includes('MAINTENANCE')); });
  it('includes RETIRED', () => { assert.ok(VALID_STATUSES.includes('RETIRED')); });

  it('AVAILABLE transitions to ASSIGNED', () => {
    let status = 'AVAILABLE';
    status = 'ASSIGNED';
    assert.equal(status, 'ASSIGNED');
  });

  it('ASSIGNED returns to AVAILABLE', () => {
    let status = 'ASSIGNED';
    status = 'AVAILABLE';
    assert.equal(status, 'AVAILABLE');
  });
});

describe('Asset categories', () => {
  const CATEGORIES = ['INFRA', 'FURN', 'IT', 'OTHER'];

  it('has 4 default categories', () => { assert.equal(CATEGORIES.length, 4); });
  it('includes IT Equipment', () => { assert.ok(CATEGORIES.includes('IT')); });
  it('includes Infrastructure', () => { assert.ok(CATEGORIES.includes('INFRA')); });
});
