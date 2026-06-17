/**
 * Performance Bonus Engine Unit Tests
 * Run with: node --test tests/performance/bonus.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const BONUS_CONFIG = [
  { min: 95, max: 100, level: 'Outstanding',        bonus: 20000 },
  { min: 85, max: 94,  level: 'Excellent',           bonus: 15000 },
  { min: 75, max: 84,  level: 'Good',                bonus: 10000 },
  { min: 50, max: 74,  level: 'Average',             bonus: 5000  },
  { min: 0,  max: 49,  level: 'Needs Improvement',  bonus: 0     },
];

function get_bonus_config(score) {
  return BONUS_CONFIG.find((b) => score >= b.min && score <= b.max) || BONUS_CONFIG[BONUS_CONFIG.length - 1];
}

describe('Bonus Engine', () => {
  it('score 100 → Outstanding PKR 20,000', () => {
    const c = get_bonus_config(100);
    assert.equal(c.level, 'Outstanding');
    assert.equal(c.bonus, 20000);
  });

  it('score 95 → Outstanding', () => {
    assert.equal(get_bonus_config(95).level, 'Outstanding');
  });

  it('score 94 → Excellent PKR 15,000', () => {
    const c = get_bonus_config(94);
    assert.equal(c.level, 'Excellent');
    assert.equal(c.bonus, 15000);
  });

  it('score 85 → Excellent', () => {
    assert.equal(get_bonus_config(85).level, 'Excellent');
  });

  it('score 84 → Good PKR 10,000', () => {
    const c = get_bonus_config(84);
    assert.equal(c.level, 'Good');
    assert.equal(c.bonus, 10000);
  });

  it('score 75 → Good', () => {
    assert.equal(get_bonus_config(75).level, 'Good');
  });

  it('score 74 → Average PKR 5,000', () => {
    const c = get_bonus_config(74);
    assert.equal(c.level, 'Average');
    assert.equal(c.bonus, 5000);
  });

  it('score 50 → Average', () => {
    assert.equal(get_bonus_config(50).level, 'Average');
  });

  it('score 49 → Needs Improvement PKR 0', () => {
    const c = get_bonus_config(49);
    assert.equal(c.level, 'Needs Improvement');
    assert.equal(c.bonus, 0);
  });

  it('score 0 → Needs Improvement', () => {
    assert.equal(get_bonus_config(0).level, 'Needs Improvement');
  });
});

describe('Engineering Score Validation', () => {
  function calc_engineering_total({ timely_delivery, quality_score, regularity, punctuality, dress_code }) {
    return (timely_delivery || 0) + (quality_score || 0) + (regularity || 0) + (punctuality || 0) + (dress_code || 0);
  }

  it('max score is 100', () => {
    const total = calc_engineering_total({ timely_delivery: 35, quality_score: 35, regularity: 10, punctuality: 10, dress_code: 10 });
    assert.equal(total, 100);
  });

  it('zero inputs give 0', () => {
    assert.equal(calc_engineering_total({}), 0);
  });

  it('partial inputs sum correctly', () => {
    const total = calc_engineering_total({ timely_delivery: 30, quality_score: 25, regularity: 8, punctuality: 7, dress_code: 5 });
    assert.equal(total, 75);
  });
});
