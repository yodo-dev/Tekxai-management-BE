import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';
import { create_user, find_user_by_id, find_users, soft_delete_user, update_user } from '../repositories/users.repository.js';

function app_error(message, status_code = 400) {
  const e = new Error(message);
  e.status_code = status_code;
  return e;
}

export async function list_users(params) {
  return find_users(params);
}

export async function get_user(id) {
  const user = await find_user_by_id(id);
  if (!user) throw app_error('User not found', 404);
  return user;
}

export async function create_new_user(body) {
  const existing = await prisma.users.findUnique({ where: { email: body.email } });
  if (existing) throw app_error('Email already in use', 409);

  const password_hash = await bcrypt.hash(body.password || Math.random().toString(36), 12);
  return create_user({ ...body, password_hash });
}

export async function update_existing_user(id, body) {
  await get_user(id); // throws 404 if not found
  return update_user(id, body);
}

export async function delete_user(id) {
  await get_user(id);
  await soft_delete_user(id);
}
