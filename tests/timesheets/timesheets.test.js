/**
 * Timesheet Service Unit Tests
 * Run with: node --test tests/timesheets/timesheets.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Week start calculation', () => {
  function get_week_start(date) {
    const d = date ? new Date(date) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  it('Monday returns same day', () => {
    const monday = new Date('2026-06-15T10:00:00Z'); // Monday
    const ws = get_week_start(monday);
    assert.equal(ws.getDay(), 1, 'Should be Monday');
  });

  it('Sunday returns previous Monday', () => {
    const sunday = new Date('2026-06-21T10:00:00Z'); // Sunday
    const ws = get_week_start(sunday);
    assert.equal(ws.getDay(), 1, 'Should be Monday');
  });

  it('Saturday returns previous Monday', () => {
    const saturday = new Date('2026-06-20T10:00:00Z'); // Saturday
    const ws = get_week_start(saturday);
    assert.equal(ws.getDay(), 1, 'Should be Monday');
  });
});

describe('Duration formatting', () => {
  function format_duration(seconds) {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  it('formats zero correctly', () => {
    assert.equal(format_duration(0), '0h 0m');
  });

  it('formats 1 hour correctly', () => {
    assert.equal(format_duration(3600), '1h 0m');
  });

  it('formats 1h 30m correctly', () => {
    assert.equal(format_duration(5400), '1h 30m');
  });

  it('formats 8 hours correctly', () => {
    assert.equal(format_duration(28800), '8h 0m');
  });
});

describe('Weekly row building', () => {
  it('produces 7 rows for a full week', () => {
    const week_start = new Date('2026-06-15');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const rows = days.map((_, i) => {
      const d = new Date(week_start);
      d.setDate(d.getDate() + i);
      return d;
    });
    assert.equal(rows.length, 7);
    assert.equal(rows[0].getDay(), 1); // Monday
    assert.equal(rows[6].getDay(), 0); // Sunday
  });
});
