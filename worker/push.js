/*!
 * E4U — reminders by push notification (Web Push, VAPID, payload encrypted with aes128gcm, RFC 8291)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * A player who switches the reminder on sends the device's push address (endpoint) with its keys, the time they chose
 * and their time zone; the server adds when their sign-in with a code ends (the Access token's exp). No e-mail, no name.
 * Every 15 minutes (wrangler.jsonc → triggers.crons) remind() sends, each at most once:
 *   'daily' — at the chosen time (up to 3 hours late) if the daily training is not done today;
 *   'soon'  — at 10:00 local time the day before the sign-in ends ("tomorrow E4U asks for the code again");
 *   'over'  — when the sign-in has ended and was not renewed (only between 9:00 and 21:00, up to 3 days after).
 * The payload is just { t, at }; the phone shows the text it keeps itself (www/sw.js), in the player's language.
 * A row without keys (made before 2.43.0) gets an empty push, shown as the daily reminder.
 *
 * GET  /api/push/key                                                   → { key } (public VAPID key; 503 'off' while not set up)
 * POST /api/push/subscribe { endpoint, keys: { p256dh, auth }, time, tz, day } → saved; answers { exp } (the sign-in end, ms)
 * POST /api/push/done      { endpoint, day }                            → the daily training is done today
 * POST /api/push/unsubscribe { endpoint }                              → deleted
 * Keys: VAPID_PUBLIC (wrangler.jsonc vars, public), VAPID_PRIVATE (secret, a JWK; `npm run vapid` makes both).
 */
export const TIMES = ['17:00', '18:00', '19:00', '20:00', '21:00'];
const MAX_SUBS = 1000, LATE_MS = 3 * 3600e3, MAX_FAILS = 5, DAY_MS = 86400e3, SOON_AT = 10 * 60;
// only the push services of the browsers: an endpoint elsewhere is refused (the server must not call arbitrary addresses)
const PUSH_HOST = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out; };
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const DAY = /^\d{4}-\d{2}-\d{2}$/, KEY = /^[A-Za-z0-9_-]{16,128}$/;
function validEndpoint(e) {
  try { const u = new URL(e); return u.protocol === 'https:' && PUSH_HOST.test(u.hostname) && e.length < 1000; } catch { return false; }
}
function validZone(tz) {
  if (typeof tz !== 'string' || tz.length > 60) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}
/** The date (YYYY-MM-DD) and the minutes since midnight in a time zone. */
export function localNow(tz, now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}

/** id: the signed-in tester from worker/index.js ({ exp } in seconds) — only the end of the sign-in is kept, not the e-mail. */
export async function pushApi(request, env, path, id = {}) {
  if (!env.DB) return json({ error: 'off' }, 503);
  if (path === '/api/push/key' && request.method === 'GET') return env.VAPID_PUBLIC ? json({ key: env.VAPID_PUBLIC }) : json({ error: 'off' }, 503);
  if (request.method !== 'POST') return json({ error: 'not_found' }, 404);
  const body = await request.json().catch(() => ({}));
  if (!validEndpoint(body.endpoint)) return json({ error: 'endpoint' }, 400);
  const sid = await sha(body.endpoint);
  if (path === '/api/push/subscribe') {
    if (!env.VAPID_PUBLIC) return json({ error: 'off' }, 503);
    if (!TIMES.includes(body.time) || !validZone(body.tz)) return json({ error: 'bad' }, 400);
    const keys = body.keys || {}, hasKeys = KEY.test(keys.p256dh || '') && KEY.test(keys.auth || '');
    const known = await env.DB.prepare('SELECT 1 FROM push_subs WHERE id = ?').bind(sid).first();
    if (!known && (await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n >= MAX_SUBS) return json({ error: 'full' }, 503);
    const exp = Number(id.exp) > 0 ? Number(id.exp) * 1000 : 0;
    await env.DB.prepare(`INSERT INTO push_subs (id, endpoint, p256dh, auth, time, tz, last_day, last_sent, session_exp, fails, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?)
      ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, time = excluded.time, tz = excluded.tz,
        last_day = excluded.last_day, session_exp = excluded.session_exp, fails = 0`)
      .bind(sid, body.endpoint, hasKeys ? keys.p256dh : '', hasKeys ? keys.auth : '', body.time, body.tz, DAY.test(body.day) ? body.day : '', exp, Date.now()).run();
    return json({ ok: true, exp });
  }
  if (path === '/api/push/done') {
    if (!DAY.test(body.day)) return json({ error: 'bad' }, 400);
    await env.DB.prepare('UPDATE push_subs SET last_day = ? WHERE id = ?').bind(body.day, sid).run();
    return json({ ok: true });
  }
  if (path === '/api/push/unsubscribe') {
    await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(sid).run();
    return json({ ok: true });
  }
  return json({ error: 'not_found' }, 404);
}

/** The VAPID authorization of a push service: a token (ES256) signed with the private key. */
async function vapid(env, endpoint, now) {
  const jwk = JSON.parse(env.VAPID_PRIVATE);
  const key = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = o => b64u(te.encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.APP_URL || 'https://e4u.slovko.win' })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}

const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info },
  await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));
/** RFC 8291: the payload encrypted for this device (its p256dh public key and auth secret), one aes128gcm record. */
export async function encrypt(text, p256dh, auth) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(secret, shared, cat(te.encode('WebPush: info\0'), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(te.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);  // record size 4096
  return cat(salt, rs, new Uint8Array([as.length]), as, data);
}

/** One push to one device: the encrypted payload when its keys are known, otherwise an empty push. Returns the status. */
async function sendPush(env, s, now, payload) {
  const headers = { TTL: '10800', Urgency: 'normal', Authorization: await vapid(env, s.endpoint, now) };
  let body = null;
  if (s.p256dh && s.auth) { body = await encrypt(JSON.stringify(payload), s.p256dh, s.auth); headers['Content-Encoding'] = 'aes128gcm'; headers['Content-Type'] = 'application/octet-stream'; }
  else headers['Content-Length'] = '0';
  try { return (await fetch(s.endpoint, { method: 'POST', headers, body })).status; } catch { return 0; }
}

/** Every 15 minutes: the reminders that are due (see the header), each at most once. */
export async function remind(env, now = Date.now()) {
  if (!env.DB || !env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return { sent: 0 };
  const { results } = await env.DB.prepare('SELECT * FROM push_subs').all();
  let sent = 0;
  for (const s of results) {
    if (!validZone(s.tz)) continue;
    const { day, min } = localNow(s.tz, now), [h, m] = s.time.split(':').map(Number), at = h * 60 + m, exp = Number(s.session_exp) || 0;
    // what is due now: the end of the sign-in first, then the daily training
    let kind = null, mark = null;
    if (exp && now >= exp && s.sent_over !== exp && now - exp < 3 * DAY_MS && min >= 9 * 60 && min < 21 * 60) { kind = 'over'; mark = 'sent_over'; }
    else if (exp && now < exp && s.sent_soon !== exp && localNow(s.tz, exp - DAY_MS).day === day && min >= SOON_AT && min < SOON_AT + 180) { kind = 'soon'; mark = 'sent_soon'; }
    else if (s.last_day !== day && s.last_sent !== day && min >= at && (min - at) * 60e3 <= LATE_MS) { kind = 'daily'; mark = 'last_sent'; }
    if (!kind) continue;
    const status = await sendPush(env, s, now, { t: kind, at: exp });
    if (status === 404 || status === 410 || ((status === 0 || status >= 400) && s.fails + 1 >= MAX_FAILS)) {
      await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(s.id).run();  // the device unsubscribed or the address is gone
    } else if (status >= 200 && status < 300) {
      sent++;
      await env.DB.prepare(`UPDATE push_subs SET ${mark} = ?, fails = 0 WHERE id = ?`).bind(mark === 'last_sent' ? day : exp, s.id).run();
    } else {
      await env.DB.prepare('UPDATE push_subs SET fails = fails + 1 WHERE id = ?').bind(s.id).run();
    }
  }
  return { sent };
}
