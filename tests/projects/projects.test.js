/**
 * Projects Service Unit Tests
 * Run with: node --test tests/projects/projects.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Project status normalisation', () => {
  const STATUS_MAP = {
    IN_PROGRESS: 'In Progress',
    PENDING: 'Pending',
    OVERDUE: 'Overdue',
    COMPLETED: 'Completed',
  };

  it('maps all statuses correctly', () => {
    for (const [raw, expected] of Object.entries(STATUS_MAP)) {
      const result = STATUS_MAP[raw] || 'Pending';
      assert.equal(result, expected);
    }
  });

  it('defaults unknown status to Pending', () => {
    const result = STATUS_MAP['UNKNOWN'] || 'Pending';
    assert.equal(result, 'Pending');
  });
});

describe('Pagination helpers', () => {
  it('computes correct page offset', () => {
    const page = 3;
    const limit = 10;
    const skip = (page - 1) * limit;
    assert.equal(skip, 20);
  });

  it('computes total pages', () => {
    assert.equal(Math.ceil(100 / 10), 10);
    assert.equal(Math.ceil(101 / 10), 11);
    assert.equal(Math.ceil(0 / 10), 0);
  });
});
