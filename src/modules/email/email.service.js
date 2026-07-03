/**
 * Email Service
 * Uses nodemailer if SMTP_HOST is configured.
 * Falls back to console.log in development.
 */

import prisma from '../../shared/database/client.js';

let transporter = null;

async function get_transporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    // Dev: create test account with ethereal if available, else console
    return null;
  }

  const nodemailer = await import('nodemailer');
  transporter = nodemailer.default.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

// FROM must match the authenticated SMTP user (server rejects mismatched domains)
const FROM_NAME = process.env.FROM_NAME || 'Tekxai ERP';
const FROM = process.env.SMTP_FROM || `"${FROM_NAME}" <${process.env.SMTP_USER || 'noreply@tekxai.com'}>`;

async function send_email({ to, subject, html, text, template }) {
  const t = await get_transporter();
  let status = 'SENT', error = null;
  try {
    if (!t) {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}\n${text || html}`);
      status = 'DEV_LOG';
    } else {
      await t.sendMail({ from: FROM, to, subject, html, text });
    }
  } catch (e) {
    status = 'FAILED';
    error = e?.message || String(e);
    throw e;
  } finally {
    prisma.email_logs.create({ data: { to_email: to, subject, template: template || null, status, error } }).catch(() => {});
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function send_otp_email(to, otp, purpose = 'password reset') {
  return send_email({
    to, template: 'OTP',
    subject: `Your Tekxai ERP OTP Code`,
    text:    `Your OTP code for ${purpose} is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.`,
    html:    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA;margin:0 0 16px">Tekxai ERP</h2>
      <p style="color:#374151">Your OTP code for <strong>${purpose}</strong> is:</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#005CDA;text-align:center;padding:24px 0">${otp}</div>
      <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>`,
  });
}

export async function send_invite_email(to, invite_url, inviter_name, role) {
  return send_email({
    to, template: 'INVITE',
    subject: `You've been invited to join Tekxai ERP`,
    text:    `${inviter_name} has invited you to join Tekxai ERP as ${role}.\nAccept your invitation: ${invite_url}`,
    html:    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA;margin:0 0 16px">Tekxai ERP</h2>
      <p style="color:#374151"><strong>${inviter_name}</strong> has invited you to join the Tekxai ERP platform as <strong>${role}</strong>.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${invite_url}" style="background:#005CDA;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700">Accept Invitation</a>
      </div>
      <p style="color:#9ca3af;font-size:12px">If you did not expect this invitation, you can ignore this email.</p>
    </div>`,
  });
}

export async function send_leave_approved_email(to, name, policy_name, date_range) {
  return send_email({
    to, template: 'LEAVE_APPROVED',
    subject: `Leave Request Approved — ${policy_name}`,
    text:    `Hi ${name},\n\nYour ${policy_name} request for ${date_range} has been approved.`,
    html:    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">Tekxai ERP</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your <strong>${policy_name}</strong> request for <strong>${date_range}</strong> has been <span style="color:#10b981;font-weight:700">approved</span>.</p>
    </div>`,
  });
}

export async function send_leave_rejected_email(to, name, policy_name, date_range, comment) {
  return send_email({
    to, template: 'LEAVE_REJECTED',
    subject: `Leave Request Rejected — ${policy_name}`,
    text:    `Hi ${name},\n\nYour ${policy_name} request for ${date_range} was rejected.\n${comment ? `Reason: ${comment}` : ''}`,
    html:    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">Tekxai ERP</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your <strong>${policy_name}</strong> request for <strong>${date_range}</strong> has been <span style="color:#ef4444;font-weight:700">rejected</span>.</p>
      ${comment ? `<p>Reason: <em>${comment}</em></p>` : ''}
    </div>`,
  });
}

export async function send_password_reset_email(to, name, otp) {
  return send_email({
    to, template: 'PASSWORD_RESET',
    subject: 'Reset Your Tekxai ERP Password',
    text: `Hi ${name},\n\nYour password reset OTP is: ${otp}\n\nExpires in 10 minutes.`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">Password Reset</h2>
      <p>Hi <strong>${name}</strong>, your OTP is:</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#005CDA;text-align:center;padding:24px 0">${otp}</div>
      <p style="color:#6b7280;font-size:13px">Expires in 10 minutes. Ignore if you didn't request this.</p>
    </div>`,
  });
}

export async function send_contract_email(to, name, contract_title, sign_url) {
  return send_email({
    to, template: 'CONTRACT',
    subject: `Contract Ready for Signature — ${contract_title}`,
    text: `Hi ${name},\n\nYour contract "${contract_title}" is ready for your signature.\n\nSign here: ${sign_url}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">Contract Ready</h2>
      <p>Hi <strong>${name}</strong>, your contract <strong>${contract_title}</strong> is ready for signature.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${sign_url}" style="background:#005CDA;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700">Sign Contract</a>
      </div>
    </div>`,
  });
}

export async function send_offer_email(to, name, position, offer_url) {
  return send_email({
    to, template: 'OFFER',
    subject: `Job Offer — ${position} at Tekxai`,
    text: `Hi ${name},\n\nWe're pleased to offer you the position of ${position}.\n\nView your offer: ${offer_url}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">Job Offer</h2>
      <p>Hi <strong>${name}</strong>, we're excited to offer you the position of <strong>${position}</strong>.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${offer_url}" style="background:#005CDA;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700">View & Accept Offer</a>
      </div>
    </div>`,
  });
}

export async function send_task_assigned_email(to, name, task_title, project_name) {
  return send_email({
    to, template: 'TASK_ASSIGNED',
    subject: `New Task Assigned: ${task_title}`,
    text: `Hi ${name},\n\nYou have been assigned a new task: "${task_title}" in project "${project_name}".`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#005CDA">New Task Assigned</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You have been assigned: <strong>${task_title}</strong> in project <strong>${project_name}</strong>.</p>
    </div>`,
  });
}

export async function send_expense_approved_email(to, name, amount, description) {
  return send_email({
    to, template: 'EXPENSE_APPROVED', subject: 'Expense Claim Approved',
    text: `Hi ${name}, your expense claim of ${amount} for "${description}" has been approved.`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#005CDA">Expense Approved</h2><p>Hi <strong>${name}</strong>, your expense claim of <strong>${amount}</strong> for <strong>${description}</strong> has been <span style="color:#10b981">approved</span>.</p></div>`,
  });
}

export async function send_expense_rejected_email(to, name, amount, description, reason) {
  return send_email({
    to, template: 'EXPENSE_REJECTED', subject: 'Expense Claim Rejected',
    text: `Hi ${name}, your expense claim of ${amount} for "${description}" was rejected. Reason: ${reason || 'Not specified'}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#005CDA">Expense Rejected</h2><p>Hi <strong>${name}</strong>, your expense claim of <strong>${amount}</strong> for <strong>${description}</strong> was <span style="color:#ef4444">rejected</span>.</p>${reason ? `<p>Reason: <em>${reason}</em></p>` : ''}</div>`,
  });
}

export async function send_performance_score_email(to, name, period, total_score) {
  return send_email({
    to, template: 'PERFORMANCE_REVIEW', subject: `Performance Review — ${period}`,
    text: `Hi ${name}, your performance score for ${period} is: ${total_score}/100.`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#005CDA">Performance Review</h2><p>Hi <strong>${name}</strong>, your performance score for <strong>${period}</strong> has been submitted.</p><div style="font-size:40px;font-weight:900;text-align:center;color:#005CDA;padding:16px 0">${total_score}<span style="font-size:20px">/100</span></div></div>`,
  });
}
