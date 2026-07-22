// Project ↔ Chat synchronization. Chat-module audit found the `channels`
// schema already has entity_type/entity_id columns clearly meant for this
// (schema.prisma:2247-2248) but nothing in the projects module ever wrote to
// them — every project's chat channel had to be created manually, and never
// stayed in sync with the project's team. This file is the single place that
// keeps a project's channel (name, membership, archived state) matching the
// project itself, called from create_project/update_project/delete_project.
//
// All functions accept a Prisma client (either the outer `prisma` or an
// active `tx`) so they can run inside the same transaction as the project
// write that triggered them — a project + its channel/membership either all
// commit together or all roll back together.

const PROJECT_ENTITY_TYPE = 'PROJECT';

export async function find_project_channel(client, project_id) {
  return client.channels.findFirst({ where: { entity_type: PROJECT_ENTITY_TYPE, entity_id: project_id } });
}

// Creates the project's channel and seeds membership from owner/leader/team.
// Idempotent: if a channel somehow already exists for this project (e.g. a
// retried request), it's reused rather than duplicated.
export async function ensure_project_channel(client, { project_id, title, owner_id, leader_id, member_user_ids = [], created_by }) {
  let channel = await find_project_channel(client, project_id);
  if (!channel) {
    channel = await client.channels.create({
      data: {
        name: title || 'Untitled Project',
        type: 'GROUP',
        entity_type: PROJECT_ENTITY_TYPE,
        entity_id: project_id,
        created_by: created_by || owner_id || leader_id || null,
      },
    });
  }
  await sync_project_channel_members(client, channel.id, { owner_id, leader_id, member_user_ids });
  return channel;
}

// Replaces channel membership with exactly {owner_id, leader_id, ...team} —
// owner/leader get OWNER role in the channel, everyone else MEMBER. Users no
// longer in any of those three sets are removed from the channel (per the
// "remove users removed from project" requirement).
export async function sync_project_channel_members(client, channel_id, { owner_id, leader_id, member_user_ids = [] }) {
  const owner_role_ids = new Set([owner_id, leader_id].filter(Boolean));
  const all_ids = new Set([...owner_role_ids, ...member_user_ids.filter(Boolean)]);

  const existing = await client.channel_members.findMany({ where: { channel_id }, select: { user_id: true } });
  const existing_ids = new Set(existing.map((m) => m.user_id));

  const to_remove = [...existing_ids].filter((id) => !all_ids.has(id));
  if (to_remove.length) {
    await client.channel_members.deleteMany({ where: { channel_id, user_id: { in: to_remove } } });
  }

  for (const user_id of all_ids) {
    await client.channel_members.upsert({
      where: { channel_id_user_id: { channel_id, user_id } },
      update: { role: owner_role_ids.has(user_id) ? 'OWNER' : 'MEMBER' },
      create: { channel_id, user_id, role: owner_role_ids.has(user_id) ? 'OWNER' : 'MEMBER' },
    });
  }
}

export async function rename_project_channel(client, project_id, title) {
  const channel = await find_project_channel(client, project_id);
  if (!channel) return null;
  return client.channels.update({ where: { id: channel.id }, data: { name: title || 'Untitled Project' } });
}

export async function set_project_channel_archived(client, project_id, is_archived) {
  const channel = await find_project_channel(client, project_id);
  if (!channel) return null;
  return client.channels.update({ where: { id: channel.id }, data: { is_archived } });
}
