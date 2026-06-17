import prisma from '../../../shared/database/client.js';

export async function find_user_with_roles_by_email(email) {
  return prisma.users.findFirst({
    where: { email, deleted_at: null },
    include: {
      roles: { include: { role: true } },
    },
  });
}

export async function find_user_with_roles_by_id(user_id) {
  return prisma.users.findFirst({
    where: { id: user_id, deleted_at: null },
    include: {
      roles: { include: { role: true } },
    },
  });
}

export async function create_refresh_token_session(data) {
  return prisma.auth_refresh_tokens.create({ data });
}

export async function find_refresh_token_by_hash(token_hash) {
  return prisma.auth_refresh_tokens.findUnique({ where: { token_hash } });
}

export async function revoke_refresh_token_by_hash(token_hash, replaced_by_token_hash = null) {
  return prisma.auth_refresh_tokens.updateMany({
    where: { token_hash, revoked_at: null },
    data: { revoked_at: new Date(), replaced_by_token_hash },
  });
}

export async function create_otp(user_id, code, purpose, expires_at) {
  // Invalidate any existing OTPs for this user + purpose
  await prisma.otp_codes.updateMany({
    where: { user_id, purpose, used_at: null },
    data: { used_at: new Date() },
  });
  return prisma.otp_codes.create({
    data: { user_id, code, purpose, expires_at },
  });
}

export async function find_valid_otp(user_id, code, purpose) {
  return prisma.otp_codes.findFirst({
    where: {
      user_id,
      code,
      purpose,
      used_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function mark_otp_used(otp_id) {
  return prisma.otp_codes.update({
    where: { id: otp_id },
    data: { used_at: new Date() },
  });
}

export async function update_user_password(user_id, password_hash) {
  return prisma.users.update({
    where: { id: user_id },
    data: { password_hash },
  });
}

export async function ensure_user_settings(user_id) {
  return prisma.user_settings.upsert({
    where: { user_id },
    update: {},
    create: { user_id },
  });
}
