import bcrypt from 'bcryptjs';
import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

export async function get_settings(user_id) {
  const s = await prisma.user_settings.findUnique({ where: { user_id } });
  if (!s) {
    return prisma.user_settings.create({ data: { user_id } });
  }
  return s;
}

export async function update_preferences(user_id, { show_notifications, language }) {
  return prisma.user_settings.upsert({
    where: { user_id },
    update: { show_notifications, language },
    create: { user_id, show_notifications, language },
  });
}

export async function change_password(user_id, { old_password, new_password }) {
  const user = await prisma.users.findUnique({ where: { id: user_id } });
  if (!user) throw app_error('User not found', 404);

  const valid = await bcrypt.compare(old_password, user.password_hash);
  if (!valid) throw app_error('Current password is incorrect', 400);

  if (new_password.length < 8) throw app_error('Password must be at least 8 characters', 400);

  const password_hash = await bcrypt.hash(new_password, 12);
  await prisma.users.update({ where: { id: user_id }, data: { password_hash } });
  return { message: 'Password updated successfully' };
}
