/**
 * field_error() unit tests — the structured validation-error helper backing
 * Milestone 1's generic backend-validation framework (field/code/message).
 * Run: node --test tests/shared/field_error.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { field_error } from '../../src/shared/errors/field_error.js';

describe('field_error', () => {
  it('produces an Error instance carrying message/field/code/status_code', () => {
    const e = field_error('Email already in use', 'email', 'DUPLICATE_EMAIL', 409);
    assert.ok(e instanceof Error);
    assert.equal(e.message, 'Email already in use');
    assert.equal(e.field, 'email');
    assert.equal(e.code, 'DUPLICATE_EMAIL');
    assert.equal(e.status_code, 409);
  });

  it('defaults status_code to 422 when omitted', () => {
    const e = field_error('bad value', 'status', 'INVALID_VALUE');
    assert.equal(e.status_code, 422);
  });
});
