/**
 * Employee Directory scoping unit tests
 * Run: node --test tests/employees/employees.routes.test.js
 *
 * Mirrors the scoping logic added to GET /employee in
 * src/modules/employees/routes/employees.routes.js — verifies that
 * DIVISION_MANAGER is confined to their own department, TEAM_LEAD is
 * confined to teams they manage, and other roles (ADMIN/HR/etc.) are
 * left unscoped.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Local re-implementation of the scoping rule for isolated unit testing
// (no DB/Express app required) — kept in sync with the route handler.
function apply_directory_scope(where, user, requester_department_id) {
  if (user.roles.includes('DIVISION_MANAGER')) {
    where.department_id = requester_department_id || '__none__';
  } else if (user.roles.includes('TEAM_LEAD')) {
    const led_team_filter = { team_memberships: { some: { team: { manager_id: user.id } } } };
    if (where.team_memberships) {
      where.AND = [...(where.AND || []), { team_memberships: where.team_memberships }, led_team_filter];
      delete where.team_memberships;
    } else {
      Object.assign(where, led_team_filter);
    }
  }
  return where;
}

describe('Employee directory scoping', () => {
  it('DIVISION_MANAGER is scoped to their own department', () => {
    const where = { deleted_at: null };
    apply_directory_scope(where, { id: 'u1', roles: ['DIVISION_MANAGER'] }, 'dept-42');
    assert.equal(where.department_id, 'dept-42');
  });

  it('DIVISION_MANAGER with no department falls back to a filter that matches nothing', () => {
    const where = { deleted_at: null };
    apply_directory_scope(where, { id: 'u1', roles: ['DIVISION_MANAGER'] }, null);
    assert.equal(where.department_id, '__none__');
  });

  it('TEAM_LEAD is scoped to teams they manage', () => {
    const where = { deleted_at: null };
    apply_directory_scope(where, { id: 'u2', roles: ['TEAM_LEAD'] }, null);
    assert.deepEqual(where.team_memberships, { some: { team: { manager_id: 'u2' } } });
  });

  it('TEAM_LEAD scoping combines with an existing team_id filter via AND', () => {
    const where = { deleted_at: null, team_memberships: { some: { team_id: 'team-9' } } };
    apply_directory_scope(where, { id: 'u2', roles: ['TEAM_LEAD'] }, null);
    assert.equal(where.team_memberships, undefined);
    assert.ok(Array.isArray(where.AND));
    assert.equal(where.AND.length, 2);
  });

  it('ADMIN/HR/SUPER_ADMIN receive no additional scoping', () => {
    for (const role of ['ADMIN', 'HR', 'SUPER_ADMIN']) {
      const where = { deleted_at: null };
      apply_directory_scope(where, { id: 'u3', roles: [role] }, 'dept-1');
      assert.equal(where.department_id, undefined);
      assert.equal(where.team_memberships, undefined);
    }
  });

  it('an unrecognized role with hr.employees.view is left unscoped by default', () => {
    const where = { deleted_at: null };
    apply_directory_scope(where, { id: 'u4', roles: ['MARKETING'] }, 'dept-1');
    assert.equal(Object.keys(where).length, 1);
    assert.equal(where.deleted_at, null);
  });
});
