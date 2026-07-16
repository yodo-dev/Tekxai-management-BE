/**
 * Ticket SLA escalation (M10) — stage-resolution unit tests.
 * The engine itself (resolve_reached_stage) is shared verbatim with the
 * compliance-escalation module; these tests exercise it against the exact
 * stage shapes seeded for TICKET_RESPONSE_SLA_BREACH / TICKET_RESOLUTION_SLA_BREACH
 * (see prisma/seeders/compliance-sample-data.seeder.js).
 * Run with: node --test tests/tickets/sla-escalation.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolve_reached_stage } from '../../src/modules/compliance-escalation/services/compliance-escalation.service.js';

const TICKET_SLA_STAGES = [
  { day_threshold: 0, notify: ['ASSIGNEE'] },
  { day_threshold: 1, notify: ['ASSIGNEE', 'SUPERVISOR'] },
  { day_threshold: 3, notify: ['ASSIGNEE', 'SUPERVISOR', 'ADMIN'] },
];

describe('Ticket SLA escalation stage resolution', () => {
  it('reaches no stage before the SLA is breached', () => {
    const r = resolve_reached_stage(TICKET_SLA_STAGES, -1);
    assert.equal(r.index, -1);
    assert.equal(r.stage, null);
  });

  it('reaches stage 0 immediately on breach (day_threshold 0)', () => {
    const r = resolve_reached_stage(TICKET_SLA_STAGES, 0);
    assert.equal(r.index, 0);
    assert.deepEqual(r.stage.notify, ['ASSIGNEE']);
  });

  it('advances to stage 1 after a full day overdue', () => {
    const r = resolve_reached_stage(TICKET_SLA_STAGES, 1);
    assert.equal(r.index, 1);
    assert.deepEqual(r.stage.notify, ['ASSIGNEE', 'SUPERVISOR']);
  });

  it('jumps straight to the highest reached stage if a run was missed (e.g. 5 days overdue)', () => {
    const r = resolve_reached_stage(TICKET_SLA_STAGES, 5);
    assert.equal(r.index, 2);
    assert.deepEqual(r.stage.notify, ['ASSIGNEE', 'SUPERVISOR', 'ADMIN']);
  });

  it('is stable regardless of stage definition order (sorts by day_threshold)', () => {
    const shuffled = [TICKET_SLA_STAGES[2], TICKET_SLA_STAGES[0], TICKET_SLA_STAGES[1]];
    const r = resolve_reached_stage(shuffled, 1);
    assert.equal(r.index, 1);
    assert.deepEqual(r.stage.notify, ['ASSIGNEE', 'SUPERVISOR']);
  });
});
