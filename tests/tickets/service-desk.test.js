/**
 * Enterprise Service Desk — dynamic form / workflow validator unit tests.
 * Run with: node --test tests/tickets/service-desk.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validate_ticket_type,
  validate_custom_fields,
  validate_workflow_transition,
} from '../../src/modules/ticket-types/validators/ticket-types.validation.js';
import { validate_ticket } from '../../src/modules/tickets/validators/tickets.validation.js';

const FIELD_SCHEMA = [
  { section: 'Request Details', fields: [
    { key: 'item', label: 'Item', type: 'text', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
];

const WORKFLOW = [
  { key: 'OPEN', label: 'Open' },
  { key: 'MANAGER_APPROVAL', label: 'Manager Approval', requires_approval: true, approver_role: 'MANAGER' },
  { key: 'PURCHASE', label: 'Purchase' },
  { key: 'CLOSED', label: 'Closed' },
];

describe('Ticket type config validation', () => {
  it('rejects a type missing key/category_id on create', () => {
    const r = validate_ticket_type({ label: 'X', field_schema: FIELD_SCHEMA, workflow: WORKFLOW });
    assert.equal(r.valid, false);
  });

  it('rejects an invalid project_association value', () => {
    const r = validate_ticket_type({
      key: 'X', category_id: 'c1', label: 'X', project_association: 'MAYBE',
      field_schema: FIELD_SCHEMA, workflow: WORKFLOW,
    });
    assert.equal(r.valid, false);
    assert.match(r.message, /project_association/);
  });

  it('rejects a malformed field_schema (missing fields array)', () => {
    const r = validate_ticket_type({
      key: 'X', category_id: 'c1', label: 'X', field_schema: [{ section: 'A' }], workflow: WORKFLOW,
    });
    assert.equal(r.valid, false);
    assert.match(r.message, /field_schema/);
  });

  it('rejects an empty workflow', () => {
    const r = validate_ticket_type({
      key: 'X', category_id: 'c1', label: 'X', field_schema: FIELD_SCHEMA, workflow: [],
    });
    assert.equal(r.valid, false);
    assert.match(r.message, /workflow/);
  });

  it('accepts a well-formed type definition', () => {
    const r = validate_ticket_type({
      key: 'X', category_id: 'c1', label: 'X', field_schema: FIELD_SCHEMA, workflow: WORKFLOW,
    });
    assert.equal(r.valid, true);
  });

  it('allows partial updates without key/category_id', () => {
    const r = validate_ticket_type({ label: 'Renamed' }, { is_update: true });
    assert.equal(r.valid, true);
  });
});

describe('Custom fields validation (against field_schema)', () => {
  it('rejects missing required fields', () => {
    const r = validate_custom_fields(FIELD_SCHEMA, { notes: 'hi' });
    assert.equal(r.valid, false);
    assert.match(r.message, /Missing required/);
    assert.match(r.message, /Item/);
    assert.match(r.message, /Quantity/);
  });

  it('rejects unknown custom field keys', () => {
    const r = validate_custom_fields(FIELD_SCHEMA, { item: 'Laptop', quantity: 1, bogus: 'x' });
    assert.equal(r.valid, false);
    assert.match(r.message, /Unknown custom field/);
    assert.match(r.message, /bogus/);
  });

  it('accepts a valid payload', () => {
    const r = validate_custom_fields(FIELD_SCHEMA, { item: 'Laptop', quantity: 2 });
    assert.equal(r.valid, true);
  });

  it('accepts an empty schema with no fields required', () => {
    const r = validate_custom_fields([], {});
    assert.equal(r.valid, true);
  });

  it('rejects an empty array for a required multiselect field (M4 dynamic form bug)', () => {
    const schema = [{ section: 'S', fields: [{ key: 'tags', label: 'Tags', type: 'multiselect', required: true }] }];
    const r = validate_custom_fields(schema, { tags: [] });
    assert.equal(r.valid, false);
    assert.match(r.message, /Tags/);
  });

  it('accepts a non-empty array for a required multiselect field', () => {
    const schema = [{ section: 'S', fields: [{ key: 'tags', label: 'Tags', type: 'multiselect', required: true }] }];
    const r = validate_custom_fields(schema, { tags: ['urgent'] });
    assert.equal(r.valid, true);
  });

  it('accepts a falsy-but-valid value like the number 0 for a required field', () => {
    const schema = [{ section: 'S', fields: [{ key: 'count', label: 'Count', type: 'number', required: true }] }];
    const r = validate_custom_fields(schema, { count: 0 });
    assert.equal(r.valid, true);
  });
});

describe('Workflow transition validation (uses the ticket\'s own type_snapshot, not the live type)', () => {
  it('rejects a status that is not a step in the workflow', () => {
    const r = validate_workflow_transition(WORKFLOW, 'OPEN', 'NOT_A_STEP');
    assert.equal(r.valid, false);
    assert.match(r.message, /Invalid workflow transition/);
  });

  it('blocks moving past an approval-gated step directly', () => {
    const r = validate_workflow_transition(WORKFLOW, 'MANAGER_APPROVAL', 'PURCHASE');
    assert.equal(r.valid, false);
    assert.match(r.message, /requires approval/);
  });

  it('allows a normal (non-gated) transition', () => {
    const r = validate_workflow_transition(WORKFLOW, 'OPEN', 'MANAGER_APPROVAL');
    assert.equal(r.valid, true);
    assert.equal(r.target_step.key, 'MANAGER_APPROVAL');
  });

  it('allows moving past a step once it is no longer the current (gated) one', () => {
    const r = validate_workflow_transition(WORKFLOW, 'PURCHASE', 'CLOSED');
    assert.equal(r.valid, true);
  });
});

describe('Ticket creation validation — Service Desk vs legacy path', () => {
  it('requires only subject/description when ticket_type_id is present', () => {
    const r = validate_ticket({ subject: 'S', description: 'D', ticket_type_id: 'type-1' });
    assert.equal(r.valid, true);
  });

  it('still requires recipient_role on the legacy path (no ticket_type_id)', () => {
    const r = validate_ticket({ subject: 'S', description: 'D' });
    assert.equal(r.valid, false);
    assert.match(r.message, /Recipient role/);
  });

  it('rejects missing subject on both paths', () => {
    const r = validate_ticket({ description: 'D', ticket_type_id: 'type-1' });
    assert.equal(r.valid, false);
  });
});
