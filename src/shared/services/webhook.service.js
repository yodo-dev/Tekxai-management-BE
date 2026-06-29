import prisma from '../database/client.js';
import crypto from 'crypto';

export async function fire_webhook(event, payload) {
  try {
    const hooks = await prisma.webhooks.findMany({
  take: 500, where: { active: true, events: { has: event } } });
    for (const hook of hooks) deliver_webhook(hook, event, payload).catch(() => {});
  } catch (e) { console.error('[webhook]', e.message); }
}

async function deliver_webhook(hook, event, payload) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json' };
  if (hook.secret) headers['X-TekXAI-Signature'] = `sha256=${crypto.createHmac('sha256', hook.secret).update(body).digest('hex')}`;

  let status_code = null, response = null, success = false;
  try {
    const r = await fetch(hook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) });
    status_code = r.status; response = await r.text().catch(() => null); success = r.ok;
  } catch (err) { response = err.message; }

  await prisma.webhook_deliveries.create({ data: { webhook_id: hook.id, event, payload, status_code, response, success } }).catch(() => {});
}
