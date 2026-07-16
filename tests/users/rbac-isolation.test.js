/**
 * RBAC Isolation Regression Tests
 *
 * Confirmed production bug: editing a SUPER_ADMIN user's profile from
 * Employee Directory silently demoted them to EMPLOYEE. Root cause: the
 * generic update_user() repository function accepted a `role_id` field and
 * unconditionally deleted+recreated the user's user_roles row whenever one
 * was present in the payload — even from a profile-only edit where role_id
 * was a stale/wrong default, not an intentional change.
 *
 * Fix: update_user() now strips role_id/role/roles/permissions/user_permissions
 * unconditionally and never touches user_roles/user_permissions. The only
 * write path for role assignment is the new set_user_role() function,
 * reachable exclusively via the dedicated PUT /users/:id/role endpoint
 * (change_user_role() in users.service.js).
 *
 * These tests monkey-patch the shared Prisma client singleton (the same
 * object every module imports, since ESM caches module instances) rather
 * than using node:test's mock.module — this Node runtime (v20) predates
 * mock.module support, and this codebase has no other module-mocking infra.
 *
 * Run: node --test tests/users/rbac-isolation.test.js
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';
import prisma from '../../src/shared/database/client.js';
import { update_user, set_user_role } from '../../src/modules/users/repositories/users.repository.js';

function stub_prisma() {
  const calls = {
    users_update: [],
    user_roles_delete: [],
    user_roles_upsert: [],
    user_roles_findFirst: [],
  };

  prisma.users.update = mock.fn(async ({ data }) => {
    calls.users_update.push(data);
    return { id: 'usr_1' };
  });
  prisma.users.findFirst = mock.fn(async () => ({
    id: 'usr_1', email: 'a@test.com', first_name: 'A', last_name: 'B',
    roles: [], team_memberships: [],
  }));
  prisma.user_roles.findFirst = mock.fn(async (args) => {
    calls.user_roles_findFirst.push(args);
    return { user_id: 'usr_1', role_id: 'role_super_admin' };
  });
  prisma.user_roles.delete = mock.fn(async (args) => {
    calls.user_roles_delete.push(args);
    return {};
  });
  prisma.user_roles.upsert = mock.fn(async (args) => {
    calls.user_roles_upsert.push(args);
    return {};
  });

  return calls;
}

describe('RBAC isolation — update_user() never touches user_roles/user_permissions', () => {
  let calls;
  beforeEach(() => { calls = stub_prisma(); });

  it('editing profile fields never changes role (role_id present in payload but ignored)', async () => {
    await update_user('usr_1', {
      first_name: 'Changed', last_name: 'Name',
      role_id: 'role_employee', // attacker/stale-default value — must be ignored
    });

    assert.equal(calls.user_roles_delete.length, 0, 'user_roles.delete must never be called from update_user');
    assert.equal(calls.user_roles_upsert.length, 0, 'user_roles.upsert must never be called from update_user');
    assert.equal(calls.user_roles_findFirst.length, 0, 'update_user must not even read user_roles');
    assert.ok(!('role_id' in calls.users_update[0]), 'role_id must not reach the users.update() data object');
  });

  it('editing HR-adjacent fields (department/designation names, phone, avatar) never changes user_roles', async () => {
    await update_user('usr_1', {
      phone: '12345', avatar: 'http://x', department: 'Engineering', role: 'SUPER_ADMIN',
    });
    assert.equal(calls.user_roles_delete.length, 0);
    assert.equal(calls.user_roles_upsert.length, 0);
  });

  it('a payload containing roles/permissions/user_permissions keys is also ignored', async () => {
    await update_user('usr_1', {
      first_name: 'X',
      roles: [{ role_id: 'role_super_admin' }],
      permissions: ['erp.users.delete'],
      user_permissions: [{ permission_key: 'erp.users.delete' }],
    });
    assert.equal(calls.user_roles_delete.length, 0);
    assert.equal(calls.user_roles_upsert.length, 0);
    const data = calls.users_update[0];
    assert.ok(!('roles' in data));
    assert.ok(!('permissions' in data));
    assert.ok(!('user_permissions' in data));
  });

  it('status is still excluded from the generic patch (pre-existing single-write-path rule, unaffected by this fix)', async () => {
    await update_user('usr_1', { first_name: 'X', status: 'INACTIVE' });
    assert.ok(!('status' in calls.users_update[0]));
  });
});

describe('RBAC isolation — set_user_role() is the sole write path for user_roles', () => {
  let calls;
  beforeEach(() => { calls = stub_prisma(); });

  it('replaces the existing role via delete+upsert when called explicitly', async () => {
    await set_user_role('usr_1', 'role_admin');
    assert.equal(calls.user_roles_delete.length, 1);
    assert.deepEqual(calls.user_roles_delete[0], {
      where: { user_id_role_id: { user_id: 'usr_1', role_id: 'role_super_admin' } },
    });
    assert.equal(calls.user_roles_upsert.length, 1);
    assert.equal(calls.user_roles_upsert[0].create.role_id, 'role_admin');
  });

  it('does not touch the users table at all (role lives only in user_roles)', async () => {
    await set_user_role('usr_1', 'role_admin');
    assert.equal(calls.users_update.length, 0);
  });
});
