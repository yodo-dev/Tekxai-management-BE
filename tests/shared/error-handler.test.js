/**
 * error_handler() unit tests — confirms field/code from field_error() flow
 * through to the JSON response, and that plain errors (no field/code) are
 * unaffected (backward compatible with every pre-existing app_error() throw).
 * Run: node --test tests/shared/error-handler.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { error_handler } from '../../src/shared/middleware/error-handler.js';
import { field_error } from '../../src/shared/errors/field_error.js';

function mock_res() {
  const res = {
    status_code: null,
    body: null,
    status(code) { this.status_code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

describe('error_handler', () => {
  it('includes field and code when the error carries them', () => {
    const err = field_error('Email already in use', 'email', 'DUPLICATE_EMAIL', 409);
    const res = mock_res();
    error_handler(err, {}, res, () => {});
    assert.equal(res.status_code, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Email already in use');
    assert.equal(res.body.field, 'email');
    assert.equal(res.body.code, 'DUPLICATE_EMAIL');
  });

  it('omits field/code for a plain error (backward compatible)', () => {
    const err = new Error('Something went wrong');
    err.status_code = 400;
    const res = mock_res();
    error_handler(err, {}, res, () => {});
    assert.equal(res.status_code, 400);
    assert.equal(res.body.message, 'Something went wrong');
    assert.equal('field' in res.body, false);
    assert.equal('code' in res.body, false);
  });

  it('defaults to 500 when no status_code is set', () => {
    const res = mock_res();
    error_handler(new Error('boom'), {}, res, () => {});
    assert.equal(res.status_code, 500);
  });
});
