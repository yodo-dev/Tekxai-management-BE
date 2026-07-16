/**
 * Meeting Management — pure validator / status-transition unit tests.
 * Run with: node --test tests/meetings/meetings-validation.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validate_meeting_room, validate_meeting, validate_agenda_item, validate_agenda_transition,
  validate_action_item, validate_attachment, classify_due_date, sort_timeline_events,
} from '../../src/modules/meetings/validators/meetings.validation.js';

describe('validate_meeting_room', () => {
  it('rejects a missing name', () => {
    const r = validate_meeting_room({});
    assert.equal(r.valid, false);
  });
  it('rejects an invalid status', () => {
    const r = validate_meeting_room({ name: 'Weekly HR', status: 'DELETED' });
    assert.equal(r.valid, false);
    assert.match(r.message, /status/);
  });
  it('accepts a well-formed room', () => {
    const r = validate_meeting_room({ name: 'Weekly HR', status: 'ACTIVE' });
    assert.equal(r.valid, true);
  });
});

describe('validate_meeting', () => {
  it('rejects a missing title', () => {
    const r = validate_meeting({ scheduled_at: new Date().toISOString() });
    assert.equal(r.valid, false);
  });
  it('rejects a missing scheduled_at', () => {
    const r = validate_meeting({ title: 'Standup' });
    assert.equal(r.valid, false);
  });
  it('rejects an invalid scheduled_at', () => {
    const r = validate_meeting({ title: 'Standup', scheduled_at: 'not-a-date' });
    assert.equal(r.valid, false);
  });
  it('accepts a well-formed meeting', () => {
    const r = validate_meeting({ title: 'Standup', scheduled_at: new Date().toISOString() });
    assert.equal(r.valid, true);
  });
});

describe('validate_agenda_item', () => {
  it('rejects a missing title', () => {
    assert.equal(validate_agenda_item({}).valid, false);
  });
  it('accepts a well-formed item', () => {
    assert.equal(validate_agenda_item({ title: 'Discuss budget' }).valid, true);
  });
});

describe('validate_agenda_transition — forward-only, completed items never reopen', () => {
  it('allows PENDING -> IN_PROGRESS', () => {
    assert.equal(validate_agenda_transition('PENDING', 'IN_PROGRESS').valid, true);
  });
  it('allows PENDING -> COMPLETED directly', () => {
    assert.equal(validate_agenda_transition('PENDING', 'COMPLETED').valid, true);
  });
  it('allows IN_PROGRESS -> COMPLETED', () => {
    assert.equal(validate_agenda_transition('IN_PROGRESS', 'COMPLETED').valid, true);
  });
  it('rejects COMPLETED -> PENDING (no reopening completed items)', () => {
    const r = validate_agenda_transition('COMPLETED', 'PENDING');
    assert.equal(r.valid, false);
    assert.match(r.message, /cannot be reopened/);
  });
  it('rejects COMPLETED -> IN_PROGRESS', () => {
    assert.equal(validate_agenda_transition('COMPLETED', 'IN_PROGRESS').valid, false);
  });
  it('rejects an unknown status value', () => {
    assert.equal(validate_agenda_transition('PENDING', 'DONE').valid, false);
  });
});

describe('validate_action_item', () => {
  it('rejects a missing assignee_id', () => {
    assert.equal(validate_action_item({ title: 'Follow up' }).valid, false);
  });
  it('rejects an invalid priority', () => {
    const r = validate_action_item({ title: 'Follow up', assignee_id: 'u1', priority: 'CRITICAL' });
    assert.equal(r.valid, false);
  });
  it('accepts a well-formed action item', () => {
    const r = validate_action_item({ title: 'Follow up', assignee_id: 'u1', priority: 'HIGH' });
    assert.equal(r.valid, true);
  });
});

describe('validate_attachment', () => {
  it('rejects an invalid attachable_type', () => {
    const r = validate_attachment({ attachable_type: 'ROOMX', attachable_id: '1', file_url: 'x', file_name: 'x.png' });
    assert.equal(r.valid, false);
  });
  it('accepts a well-formed attachment', () => {
    const r = validate_attachment({ attachable_type: 'MEETING', attachable_id: '1', file_url: 'https://x/y', file_name: 'notes.pdf' });
    assert.equal(r.valid, true);
  });
});

describe('classify_due_date — dashboard and scheduler share this exact logic', () => {
  const now = new Date('2026-07-16T12:00:00Z');

  it('returns NONE when there is no due_date', () => {
    assert.equal(classify_due_date(null, 'PENDING', now), 'NONE');
  });
  it('returns NONE for a completed item even if overdue', () => {
    assert.equal(classify_due_date('2026-07-01T00:00:00Z', 'COMPLETED', now), 'NONE');
  });
  it('returns OVERDUE for a past due_date', () => {
    assert.equal(classify_due_date('2026-07-10T00:00:00Z', 'PENDING', now), 'OVERDUE');
  });
  it('returns DUE_TODAY for a due_date within today', () => {
    assert.equal(classify_due_date('2026-07-16T18:00:00Z', 'IN_PROGRESS', now), 'DUE_TODAY');
  });
  it('returns UPCOMING for a future due_date', () => {
    assert.equal(classify_due_date('2026-07-20T00:00:00Z', 'PENDING', now), 'UPCOMING');
  });
});

describe('sort_timeline_events — chronological ordering, oldest first', () => {
  it('sorts events ascending by created_at', () => {
    const events = [
      { id: 3, created_at: '2026-07-16T10:00:00Z' },
      { id: 1, created_at: '2026-07-14T10:00:00Z' },
      { id: 2, created_at: '2026-07-15T10:00:00Z' },
    ];
    const sorted = sort_timeline_events(events);
    assert.deepEqual(sorted.map((e) => e.id), [1, 2, 3]);
  });
  it('does not mutate the original array', () => {
    const events = [{ id: 2, created_at: '2026-07-15T10:00:00Z' }, { id: 1, created_at: '2026-07-14T10:00:00Z' }];
    const original = [...events];
    sort_timeline_events(events);
    assert.deepEqual(events, original);
  });
});
