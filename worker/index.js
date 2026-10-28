/*!
 * E4U — server part (Cloudflare Worker): admin API for the testers list
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Only /api/* reaches this code (wrangler.jsonc → assets.run_worker_first);
 * the game itself is served as static files from www/.
 *
 * GET    /api/me        → { email, admin }
 * GET    /api/testers   → { emails, admins, langs, limit }          (admin only)
 * POST   /api/testers   { email, lang } → add to the Access policy   (admin only)
 * DELETE /api/testers   { email, lang } → remove                      (admin only)
 * POST   /api/testers/notice { email, kind } → a one-off letter to a tester, in their language (admin only):
 *        kind 'android' (reinstall as an app); each kind is sent to a tester once (t:<email>.notices[kind])
 * POST   /api/feedback  { text, context, lang, version } → e-mail to the owner (any signed-in tester, 20/day)
 * /api/tournament…, /api/round → the tournament among testers (worker/tournament.js, D1 database DB)
 * /api/stats…   → anonymous task statistics: sent after a round, read by the owner (worker/stats.js)
 * /api/push…    → reminders of the daily training (worker/push.js); scheduled() sends them every 15 minutes
 * Adding or removing also e-mails the tester (worker/mail.js); the answer says how it went:
 * mail = 'sent' | 'off' (mail not set up) | 'failed' | 'none' (nothing to send), kind = 'invite' | 'back' | 'removed'.
 *
 * Who is asking: Cloudflare Access puts a signed token (JWT) into every request;
 * it is verified here against the team's public keys, so it cannot be faked.
 * Secrets (wrangler secret put): CF_API_TOKEN, ADMIN_EMAILS (comma-separated), RESEND_API_KEY.
 * KV namespace TESTERS keeps each tester's history: t:<email> → { lang, active, added[], removed[] },
 * and the last visit: s:<email> → { seen, login, exp } (see touch()).
 */
import { compose, composeReport, send, MAIL_LANGS, NOTICES } from './mail.js';
import { tournamentApi, leave, nicksOf } from './tournament.js';
import { statsApi } from './stats.js';
import { pushApi, remind } from './push.js';

const LIMIT = 50;  // free Cloudflare Access seats, the owner included
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url.pathname);
    } catch (e) {
      console.error('api error:', e && e.message || e);  // visible in `npx wrangler tail`
      return json({ error: 'server', detail: String(e && e.message || e) }, 500);
    }
  },
  // Cron (wrangler.jsonc → triggers.crons): reminders of the daily training
  async scheduled(event, env, ctx) {
    ctx.waitUntil(remind(env, event.scheduledTime).then(r => console.log('reminders sent:', r.sent)).catch(e => console.error('reminders:', e && e.message || e)));
  },
};

async function api(request, env, path) {
  const id = await accessIdentity(request, env);
  if (!id) return json({ error: 'auth' }, 401);
  const { email } = id;
  const admin = admins(env).includes(email);
  if (path === '/api/me') { await touch(env, id); return json({ email, admin }); }
  // a custom header cannot be sent cross-site without CORS, which this API never allows
  if (request.method !== 'GET' && request.headers.get('X-E4U') !== '1') return json({ error: 'forbidden' }, 403);
  if (path === '/api/feedback') return feedback(request, env, email);
  if (path === '/api/round' || path.startsWith('/api/tournament')) return tournamentApi(request, env, path, email, admin);
  if (path.startsWith('/api/stats')) return statsApi(request, env, path, admin);
  if (path.startsWith('/api/push/')) return pushApi(request, env, path, id);
  if (path === '/api/testers/notice') return admin ? notice(request, env) : json({ error: 'forbidden' }, 403);
  if (path !== '/api/testers') return json({ error: 'not_found' }, 404);
  if (!admin) return json({ error: 'forbidden' }, 403);

  const policy = await getPolicy(env);
  const list = emailsOf(policy);
  const out = async extra => {
    const emails = emailsOf(policy).sort(), langs = {}, invited = {}, seen = {};
    await Promise.all(emails.map(async e => {
      const [r, s] = await Promise.all([record(env, e), env.TESTERS.get('s:' + e, 'json')]);
      if (r) { langs[e] = r.lang; if (r.added.length) invited[e] = Date.parse(r.added.at(-1)); }
      if (s) seen[e] = s;
    }));
    const nicks = await nicksOf(env, emails);
    return json({ emails, admins: admins(env), langs, invited, seen, nicks, now: Date.now(), limit: LIMIT, ...extra });
  };
  if (request.method === 'GET') return out();

  const body = await request.json().catch(() => ({}));
  const who = String(body.email || '').trim().toLowerCase();
  const lang = MAIL_LANGS.includes(body.lang) ? body.lang : 'en';
  if (!EMAIL.test(who)) return json({ error: 'bad_email' }, 400);
  const rec = await record(env, who) || { lang, active: false, added: [], removed: [] };
  const now = new Date().toISOString();
  let kind;

  if (request.method === 'POST') {
    if (list.includes(who)) return out({ mail: 'none' });
    if (list.length >= LIMIT) return json({ error: 'limit' }, 409);
    policy.include.push({ email: { email: who } });
    kind = rec.removed.length ? 'back' : 'invite';
    Object.assign(rec, { lang, active: true }); rec.added.push(now);
  } else if (request.method === 'DELETE') {
    if (admins(env).includes(who)) return json({ error: 'self' }, 409);  // never lock the owner out
    if (!list.includes(who)) return out({ mail: 'none' });
    policy.include = policy.include.filter(r => !(r.email && r.email.email.toLowerCase() === who));
    kind = 'removed';
    rec.active = false; rec.removed.push(now);
    await leave(env, who);  // a removed tester leaves the tournament too: nick and results are deleted
  } else return json({ error: 'method' }, 405);

  await putPolicy(env, policy);
  await env.TESTERS.put('t:' + who, JSON.stringify(rec));
  // the invitation carries the install steps in its text, no attachment (attachments from a new domain look like spam)
  const mail = await send(env, who, compose(kind, rec.lang, who, env.APP_URL));
  return out({ mail, kind });
}

/* ---------- one-off letters to testers (worker/mail.js NOTICES), each at most once per tester ---------- */
async function notice(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await request.json().catch(() => ({}));
  const who = String(body.email || '').trim().toLowerCase(), kind = String(body.kind || '');
  if (!NOTICES.includes(kind)) return json({ error: 'kind' }, 400);
  if (!emailsOf(await getPolicy(env)).includes(who)) return json({ error: 'not_tester' }, 404);
  const rec = await record(env, who) || { lang: 'en', active: true, added: [], removed: [] };
  rec.notices = rec.notices || {};
  if (rec.notices[kind]) return json({ mail: 'none', at: rec.notices[kind] });  // already sent: never twice
  const mail = await send(env, who, compose(kind, rec.lang, who, env.APP_URL));
  if (mail === 'sent') { rec.notices[kind] = new Date().toISOString(); await env.TESTERS.put('t:' + who, JSON.stringify(rec)); }
  return json({ mail, lang: rec.lang });
}

/* ---------- reports from testers ("Сообщить об ошибке") → e-mail to the owner ---------- */
const REPORTS_PER_DAY = 20;

async function feedback(request, env, from) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await request.json().catch(() => ({}));
  const text = String(body.text || '').trim().slice(0, 2000);
  const context = String(body.context || '').trim().slice(0, 3000);
  if (!text) return json({ error: 'empty' }, 400);
  const day = new Date().toISOString().slice(0, 10), key = `fb:${from}:${day}`;
  const count = Number(await env.TESTERS.get(key) || 0);
  if (count >= REPORTS_PER_DAY) return json({ error: 'too_many' }, 429);
  await env.TESTERS.put(key, String(count + 1), { expirationTtl: 2 * 86400 });
  const meta = [`Версия: ${String(body.version || '?').slice(0, 20)}`, `Язык интерфейса: ${String(body.lang || '?').slice(0, 5)}`,
    `Устройство: ${(request.headers.get('User-Agent') || '?').slice(0, 200)}`, `Время: ${new Date().toISOString()}`].join('\n');
  const to = admins(env)[0];
  if (!to) return json({ error: 'server' }, 500);
  const mail = await send(env, to, composeReport(from, text, context, meta), null, from);
  if (mail !== 'sent') return json({ error: 'mail', mail }, 502);
  return json({ ok: true });
}

/* ---------- last visit: written when the app starts online (/api/me) ---------- */
const TOUCH_EVERY = 3600e3;  // at most one KV write per person per hour (free plan: 1000 writes a day)

/** s:<email> → { seen: last visit, login: when the code was entered, exp: when this Access session ends } (ms) */
async function touch(env, { email, iat, exp }) {
  const now = Date.now(), cur = await env.TESTERS.get('s:' + email, 'json');
  const next = { seen: now, login: iat * 1000, exp: exp * 1000 };
  if (cur && now - cur.seen < TOUCH_EVERY && cur.exp === next.exp) return;
  await env.TESTERS.put('s:' + email, JSON.stringify(next));
}

async function record(env, email) {
  return JSON.parse(await env.TESTERS.get('t:' + email) || 'null');
}

const admins = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const emailsOf = policy => policy.include.filter(r => r.email).map(r => r.email.email.toLowerCase());
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

/* ---------- Cloudflare Access: who sent the request ---------- */
let certs = null, certsAt = 0;

/** { email, iat, exp } of a valid Access token, or null. iat = sign-in time, exp = end of the session (seconds). */
async function accessIdentity(request, env) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return null;
  const [h, p, s] = jwt.split('.');
  if (!s) return null;
  const header = JSON.parse(unb64(h)), claims = JSON.parse(unb64(p));
  const now = Date.now() / 1000;
  // one AUD tag per Access application (old workers.dev address, e4u.slovko.win), comma-separated
  const ours = String(env.ACCESS_AUD || '').split(',').map(s => s.trim()).filter(Boolean);
  const aud = [].concat(claims.aud || []);
  if (!aud.some(a => ours.includes(a)) || claims.iss !== `https://${env.ACCESS_TEAM}` || !(claims.exp > now)) return null;
  const jwk = (await accessKeys(env)).find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(s), new TextEncoder().encode(`${h}.${p}`));
  return ok && claims.email ? { email: String(claims.email).toLowerCase(), iat: Number(claims.iat) || now, exp: Number(claims.exp) } : null;
}

async function accessKeys(env) {
  if (!certs || Date.now() - certsAt > 3600e3) {
    const res = await fetch(`https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`);
    certs = (await res.json()).keys || [];
    certsAt = Date.now();
  }
  return certs;
}

const b64 = s => s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4);
const bytes = s => Uint8Array.from(atob(b64(s)), c => c.charCodeAt(0));
const unb64 = s => new TextDecoder().decode(bytes(s));

/* ---------- Cloudflare API: the "Testers" policy ---------- */
async function cf(env, path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}${path}`, {
    ...init, headers: { Authorization: `Bearer ${String(env.CF_API_TOKEN || '').trim()}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(`Cloudflare API ${res.status}: ${JSON.stringify(data.errors || data)}`);
  return data.result;
}

async function getPolicy(env) {
  const all = await cf(env, '/access/policies?per_page=100');
  const found = all.find(p => p.name === env.POLICY_NAME);
  if (!found) throw new Error(`policy "${env.POLICY_NAME}" not found`);
  const policy = await cf(env, `/access/policies/${found.id}`);
  policy.include = policy.include || [];
  return policy;
}

// fields a policy update accepts; read-only ones (id, dates, app_count, reusable) are left out
const POLICY_FIELDS = ['name', 'decision', 'include', 'exclude', 'require', 'session_duration', 'approval_required',
  'approval_groups', 'isolation_required', 'purpose_justification_required', 'purpose_justification_prompt', 'connection_rules'];

async function putPolicy(env, policy) {
  const body = {};
  for (const k of POLICY_FIELDS) if (policy[k] !== undefined) body[k] = policy[k];
  await cf(env, `/access/policies/${policy.id}`, { method: 'PUT', body: JSON.stringify(body) });
}
