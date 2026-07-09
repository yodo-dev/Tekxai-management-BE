/**
 * Budget validation + extension request workflow validators — unit tests.
 * Run with: node --test tests/projects/extension-and-budget.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validate_create_project,
  validate_update_project,
  validate_budget_update,
  validate_extension_request,
  validate_extension_review,
} from '../../src/modules/projects/validators/projects.validation.js';

describe('Budget validation', () => {
  it('rejects negative budget on create', () => {
    const result = validate_create_project({ title: 'Test', budget: -100 });
    assert.equal(result.valid, false);
    assert.match(result.message, /negative/i);
  });

  it('rejects negative budget_spent on update', () => {
    const result = validate_update_project({ budget_spent: -1 });
    assert.equal(result.valid, false);
    assert.match(result.message, /negative/i);
  });

  it('accepts zero and positive budget values', () => {
    assert.equal(validate_create_project({ title: 'Test', budget: 0 }).valid, true);
    assert.equal(validate_create_project({ title: 'Test', budget: 5000 }).valid, true);
  });

  it('accepts missing/null budget (optional field)', () => {
    assert.equal(validate_create_project({ title: 'Test' }).valid, true);
    assert.equal(validate_update_project({ budget: null }).valid, true);
  });

  it('validate_budget_update rejects negative budget and budget_spent', () => {
    assert.equal(validate_budget_update({ budget: -1 }).valid, false);
    assert.equal(validate_budget_update({ budget_spent: -1 }).valid, false);
    assert.equal(validate_budget_update({ budget: 100, budget_spent: 50 }).valid, true);
  });
});

describe('Extension request validation', () => {
  it('requires proposed_deadline and reason', () => {
    assert.equal(validate_extension_request({}).valid, false);
    assert.equal(validate_extension_request({ proposed_deadline: '2026-08-01' }).valid, false);
    assert.equal(validate_extension_request({ proposed_deadline: '2026-08-01', reason: 'delay' }).valid, true);
  });

  it('rejects blank/whitespace-only reason', () => {
    assert.equal(validate_extension_request({ proposed_deadline: '2026-08-01', reason: '   ' }).valid, false);
  });
});

describe('Extension review validation', () => {
  it('only accepts APPROVED or REJECTED status', () => {
    assert.equal(validate_extension_review({ status: 'PENDING' }).valid, false);
    assert.equal(validate_extension_review({ status: 'APPROVED' }).valid, true);
  });

  it('requires review_reason when rejecting', () => {
    assert.equal(validate_extension_review({ status: 'REJECTED' }).valid, false);
    assert.equal(validate_extension_review({ status: 'REJECTED', review_reason: 'Not enough justification' }).valid, true);
  });

  it('does not require review_reason when approving', () => {
    assert.equal(validate_extension_review({ status: 'APPROVED' }).valid, true);
  });
});
