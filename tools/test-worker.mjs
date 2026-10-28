/*!
 * E4U — offline test of the server part (worker/): `npm test`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Runs worker/index.js against fakes: Access sign-in keys, Cloudflare API, Resend, KV, static files.
 * Nothing leaves the computer. Checks sign-in, the testers list, e-mails, reports and visits.
 * `npm test -- --verbose` (or `node tools/test-worker.mjs --verbose`) prints every check, not only failures.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const worker = (await import(pathToFileURL(join(ROOT, 'worker', 'index.js')).href)).default;
const VERBOSE = process.argv.includes('--verbose');

/* ---------- fakes ---------- */
const TEAM = 'team.cloudflareaccess.com', AUD = 'aud123';
const kv = new Map();
const env = { ACCOUNT_ID: 'acc', ACCESS_TEAM: TEAM, ACCESS_AUD: 'old-aud, ' + AUD, POLICY_NAME: 'Testers',
  CF_API_TOKEN: 'tok', ADMIN_EMAILS: 'Owner@Example.com', APP_URL: 'https://app.test', MAIL_FROM: '',
  ASSETS: { fetch: r => new URL(r.url ?? r).pathname === '/install/INSTALL-uk.pdf' ? new Response(new Uint8Array([37, 80, 68, 70])) : new Response('asset') },
  TESTERS: {
    get: async (k, type) => { const v = kv.get(k) ?? null; return type === 'json' && v !== null ? JSON.parse(v) : v; },
    put: async (k, v) => { kv.set(k, v); },
  } };
const mails = []; let resendOk = true;

// the tournament database: SQLite in memory with the real schema, behind the same calls as Cloudflare D1
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(join(ROOT, 'worker', 'schema.sql'), 'utf8'));
const stmt = (q, args = []) => ({ q, args, bind: (...a) => stmt(q, a),
  first: async () => sql.prepare(q).get(...args) ?? null, all: async () => ({ results: sql.prepare(q).all(...args) }),
  run: async () => sql.prepare(q).run(...args) });
env.DB = { prepare: q => stmt(q), batch: async list => list.map(s => sql.prepare(s.q).run(...s.args)) };

const RSA = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const kp = await crypto.subtle.generateKey(RSA, true, ['sign', 'verify']);
const pub = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256' };
const b64u = b => Buffer.from(b).toString('base64url');
async function jwt(claims, key = kp.privateKey) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify(claims));
  const s = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(s)}`;
}
const exp = Math.floor(Date.now() / 1000) + 600;
const claims = email => ({ aud: [AUD], iss: `https://${TEAM}`, exp, email });

let policy = { id: 'pol1', name: 'Testers', decision: 'allow', reusable: true, app_count: 1, created_at: 'x',
  include: [{ email: { email: 'owner@example.com' } }, { email: { email: 'friend@example.com' } }], session_duration: '168h' };
let lastPut = null;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url === `https://${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [pub] });
  if (url === 'https://api.resend.com/emails') { mails.push(JSON.parse(init.body)); return resendOk ? Response.json({ id: 'm1' }) : Response.json({ message: 'nope' }, { status: 422 }); }
  if (init.headers?.Authorization !== 'Bearer tok') return Response.json({ success: false }, { status: 403 });
  if (url.endsWith('/access/policies?per_page=100')) return Response.json({ success: true, result: [{ id: 'other', name: 'X' }, { id: 'pol1', name: 'Testers' }] });
  if (url.endsWith('/access/policies/pol1') && (init.method || 'GET') === 'GET') return Response.json({ success: true, result: structuredClone(policy) });
  if (url.endsWith('/access/policies/pol1') && init.method === 'PUT') { lastPut = JSON.parse(init.body); policy = { ...policy, ...lastPut }; return Response.json({ success: true, result: policy }); }
  return Response.json({ success: false }, { status: 404 });
};
console.error = () => {};  // the worker logs expected failures (mail errors); keep the output readable

const req = async (method, path, { token, body, hdr = true } = {}) => {
  const headers = {};
  if (token) headers['Cf-Access-Jwt-Assertion'] = token;
  if (hdr) headers['X-E4U'] = '1';
  const r = await worker.fetch(new Request('https://e4u.test' + path, { method, headers, body: body && JSON.stringify(body) }), env);
  return [r.status, await r.text()];
};

/* ---------- checks: t(name, got, want) passes when `want` is found in `got` ---------- */
let fails = 0, total = 0;
const show = got => typeof got === 'string' ? got
  : Array.isArray(got) && typeof got[0] === 'number' && typeof got[1] === 'string' ? got.join(' ') : JSON.stringify(got);
const t = (name, got, want) => {
  const ok = String(show(got)).includes(want); total++;
  if (!ok) fails++;
  if (!ok || VERBOSE) console.log(ok ? 'OK  ' : 'FAIL', name, ok ? '' : `\n     got: ${show(got)}\n     want: ${want}`);
};

const owner = await jwt(claims('owner@example.com')), friend = await jwt(claims('friend@example.com'));
const other = await crypto.subtle.generateKey(RSA, true, ['sign', 'verify']);

// sign-in
t('static files bypass the server code', await req('GET', '/index.html'), 'asset');
t('no token -> 401', await req('GET', '/api/me'), '401');
t('forged signature -> 401', await req('GET', '/api/me', { token: await jwt(claims('owner@example.com'), other.privateKey) }), '401');
t('wrong audience -> 401', await req('GET', '/api/me', { token: await jwt({ ...claims('owner@example.com'), aud: ['zzz'] }) }), '401');
t('expired -> 401', await req('GET', '/api/me', { token: await jwt({ ...claims('owner@example.com'), exp: 1 }) }), '401');
t('owner is admin', await req('GET', '/api/me', { token: owner }), '"admin":true');
t('tester is not admin', await req('GET', '/api/me', { token: friend }), '"admin":false');

// testers list
t('tester cannot see the list', await req('GET', '/api/testers', { token: friend }), '403');
t('tester cannot add', await req('POST', '/api/testers', { token: friend, body: { email: 'x@y.sk' } }), '403');
t('owner sees the list', await req('GET', '/api/testers', { token: owner }), 'friend@example.com');
t('POST without X-E4U -> 403', await req('POST', '/api/testers', { token: owner, body: { email: 'x@y.sk' }, hdr: false }), '403');
t('bad e-mail -> 400', await req('POST', '/api/testers', { token: owner, body: { email: 'not an email' } }), 'bad_email');
t('add (trimmed, lower-case)', await req('POST', '/api/testers', { token: owner, body: { email: ' New@Mail.SK ' } }), 'new@mail.sk');
t('policy update sends no read-only fields', Object.keys(lastPut).sort().join(','), 'decision,include,name,session_duration');
t('session duration kept', lastPut.session_duration, '168h');
t('adding twice keeps one entry', String(JSON.parse((await req('POST', '/api/testers', { token: owner, body: { email: 'new@mail.sk' } }))[1]).emails.length), '3');
t('remove', await req('DELETE', '/api/testers', { token: owner, body: { email: 'friend@example.com' } }), '["new@mail.sk","owner@example.com"]');
t('owner cannot remove themselves', await req('DELETE', '/api/testers', { token: owner, body: { email: 'owner@example.com' } }), 'self');
t('no mail key -> mail "off"', await req('POST', '/api/testers', { token: owner, body: { email: 'off@t.sk', lang: 'sk' } }), '"mail":"off"');
t('e-mail language stored', await req('GET', '/api/testers', { token: owner }), '"off@t.sk":"sk"');

// e-mails
env.RESEND_API_KEY = 'rk'; env.MAIL_FROM = 'E4U <hello@e4u.test>';
t('invitation sent', await req('POST', '/api/testers', { token: owner, body: { email: 'anna@t.sk', lang: 'uk' } }), '"mail":"sent","kind":"invite"');
let m = mails.at(-1);
t('invitation in Ukrainian', m.subject, 'Запрошення');
t('invitation has no attachment', String(m.attachments), 'undefined');
t('invitation has the install steps in Ukrainian', m.text, '«Поділитися» → «На початковий екран»');
t('install steps name the address', m.text, 'e-mail-адресу (anna@t.sk)');
t('invitation has the app link', m.text, 'https://app.test');
t('invitation names the address', m.text, 'anna@t.sk');
t('invitation points to the privacy notice', m.text, 'Конфіденційність');
t('replies go to the owner', m.reply_to, 'owner@example.com');
t('adding an active tester sends nothing', await req('POST', '/api/testers', { token: owner, body: { email: 'anna@t.sk', lang: 'uk' } }), '"mail":"none"');
t('removal notice sent', await req('DELETE', '/api/testers', { token: owner, body: { email: 'anna@t.sk', lang: 'ru' } }), '"kind":"removed"');
m = mails.at(-1);
t('removal in the stored language (uk)', m.subject, 'Доступ до E4U закрито');
t('removal has no PDF', String(m.attachments), 'undefined');
t('removal tells how to have the data deleted', m.text, 'повністю видалили');
t('added again -> welcome back', await req('POST', '/api/testers', { token: owner, body: { email: 'anna@t.sk', lang: 'en' } }), '"kind":"back"');
m = mails.at(-1);
t('welcome back in the new language', m.subject, 'Welcome back');
t('welcome back has no PDF', String(m.attachments), 'undefined');
policy.include.push({ email: { email: 'legacy@t.sk' } });  // added in the dashboard, no history in KV
t('removing a dashboard-added tester uses the screen language', (await req('DELETE', '/api/testers', { token: owner, body: { email: 'legacy@t.sk', lang: 'sk' } }), mails.at(-1).subject), 'Prístup do aplikácie E4U');
t('Spanish invitation', (await req('POST', '/api/testers', { token: owner, body: { email: 'ana@t.es', lang: 'es' } }), mails.at(-1).subject), 'Invitación para probar E4U');
t('Spanish invitation points to the privacy notice', mails.at(-1).text, 'Ajustes → Privacidad');
t('Spanish invitation has the install steps', mails.at(-1).text, 'Añadir a pantalla de inicio');
t('HTML escapes the address',(await req('POST', '/api/testers', { token: owner, body: { email: 'a&b@t.sk', lang: 'en' } }), mails.at(-1).html), 'a&amp;b@t.sk');
t('invitation: Android installs the app, not a shortcut', mails.at(-1).text, 'menu ⋮ → Install app');
// one-off notices: the owner only, testers only, in the tester's language, once
t('notice: a tester cannot send', await req('POST', '/api/testers/notice', { token: friend, body: { email: 'ana@t.es', kind: 'android' } }), '403');
t('notice: unknown kind', await req('POST', '/api/testers/notice', { token: owner, body: { email: 'ana@t.es', kind: 'spam' } }), '"error":"kind"');
t('notice: not a tester', await req('POST', '/api/testers/notice', { token: owner, body: { email: 'nobody@t.sk', kind: 'android' } }), 'not_tester');
t('notice: sent', await req('POST', '/api/testers/notice', { token: owner, body: { email: 'ana@t.es', kind: 'android' } }), '"mail":"sent"');
t('notice: in the tester’s language (es)', mails.at(-1).subject, 'E4U en Android');
t('notice: has the link and the steps', mails.at(-1).text, 'https://app.test');
const nMails = mails.length;
t('notice: never twice', await req('POST', '/api/testers/notice', { token: owner, body: { email: 'ana@t.es', kind: 'android' } }), '"mail":"none"');
t('notice: no second e-mail', String(mails.length), String(nMails));
resendOk = false;
t('mail error: access still given', await req('POST', '/api/testers', { token: owner, body: { email: 'fail@t.sk', lang: 'en' } }), '"fail@t.sk"');
t('mail error reported as "failed"', JSON.parse((await req('POST', '/api/testers', { token: owner, body: { email: 'fail2@t.sk' } }))[1]).mail, 'failed');
resendOk = true;
for (let i = 0; i < 44; i++) policy.include.push({ email: { email: `u${i}@t.sk` } });
t('51st person -> limit', await req('POST', '/api/testers', { token: owner, body: { email: 'one-more@t.sk' } }), 'limit');

// last visit
let puts = 0; const put0 = env.TESTERS.put; env.TESTERS.put = async (k, v, o) => { if (k.startsWith('s:')) puts++; return put0(k, v, o); };
const iat = Math.floor(Date.now() / 1000) - 3600;
const ownerV = await jwt({ ...claims('owner@example.com'), iat, exp: exp + 60 });  // a fresh sign-in: new session end
await req('GET', '/api/me', { token: ownerV });
const sv = JSON.parse(kv.get('s:owner@example.com') || 'null');
t('visit stored: sign-in time and session end', [!!sv, sv && sv.login === iat * 1000, sv && sv.exp === (exp + 60) * 1000], '[true,true,true]');
await req('GET', '/api/me', { token: ownerV });
t('second visit within an hour: no extra write', String(puts), '1');
const list2 = JSON.parse((await req('GET', '/api/testers', { token: owner }))[1]);
t('list has visits, invitations and server time', [!!list2.seen['owner@example.com'], typeof list2.invited['anna@t.sk'] === 'number', typeof list2.now === 'number'], '[true,true,true]');
t('tester who never opened the app has no visit', String(list2.seen['anna@t.sk']), 'undefined');
env.TESTERS.put = put0;

// reports from testers
t('report without X-E4U -> 403', await req('POST', '/api/feedback', { token: friend, body: { text: 'x' }, hdr: false }), '403');
t('report without sign-in -> 401', await req('POST', '/api/feedback', { body: { text: 'x' } }), '401');
t('empty report -> 400', await req('POST', '/api/feedback', { token: friend, body: { text: '  ' } }), 'empty');
t('report sent', await req('POST', '/api/feedback', { token: friend, body: { text: 'Форма неверная <b>', context: 'Спряжение · quiz\nísť — ty', lang: 'sk', version: '2.5.0' } }), '"ok":true');
m = mails.at(-1);
t('report goes to the owner', m.to, 'owner@example.com');
t('reply goes to the tester', m.reply_to, 'friend@example.com');
t('report subject', m.subject, 'ошибка в задании от friend@example.com');
t('report has text, task, version', [m.text.includes('Форма неверная'), m.text.includes('ísť — ty'), m.text.includes('2.5.0')], '[true,true,true]');
t('report HTML escaped', m.html, '&lt;b&gt;');
for (let i = 0; i < 19; i++) await req('POST', '/api/feedback', { token: friend, body: { text: 'n' + i } });
t('21st report a day -> too_many', await req('POST', '/api/feedback', { token: friend, body: { text: 'one more' } }), 'too_many');
t('another person is not limited', await req('POST', '/api/feedback', { token: owner, body: { text: 'hi' } }), '"ok":true');
resendOk = false;
t('mail failure reported', await req('POST', '/api/feedback', { token: owner, body: { text: 'hi' } }), '502');
resendOk = true;

// tournament
const anna = await jwt(claims('anna@t.sk'));
const round = (token, r) => req('POST', '/api/round', { token, body: { section: 'verbs', answered: 30, correct: 25, ...r } });
t('round from a non-participant is not stored', await round(owner, { mode: 'blitz', level: 'a1', xp: 50, score: 50 }), '"counted":false');
t('not in the tournament yet', await req('GET', '/api/tournament', { token: owner }), '"nick":""');
t('nick too short -> nick_bad', await req('POST', '/api/tournament/nick', { token: owner, body: { nick: 'a' } }), 'nick_bad');
t('nick with odd characters -> nick_bad', await req('POST', '/api/tournament/nick', { token: owner, body: { nick: '<b>x</b>' } }), 'nick_bad');
t('join as «Ana»', await req('POST', '/api/tournament/nick', { token: owner, body: { nick: ' Ana ' } }), '"nick":"Ana"');
t('«ana» is taken by someone else', await req('POST', '/api/tournament/nick', { token: anna, body: { nick: 'ana' } }), 'nick_taken');
t('Cyrillic nick «Петро»', await req('POST', '/api/tournament/nick', { token: anna, body: { nick: 'Петро' } }), '"nick":"Петро"');
t('round counted', await round(owner, { mode: 'blitz', level: 'a1', xp: 120, score: 120 }), '"counted":true');
await round(owner, { mode: 'quiz', level: 'a1', xp: 80, score: 80 });
await round(anna, { mode: 'blitz', level: 'a1', xp: 150, score: 150 });
await round(anna, { mode: 'blitz', level: 'a2', xp: 90, score: 90 });
t('impossible score rejected', await round(anna, { mode: 'blitz', level: 'a1', xp: 99999, score: 99999 }), 'bad_round');
t('unknown level rejected', await round(anna, { mode: 'blitz', level: 'c2', xp: 10, score: 10 }), 'bad_round');
let tour = JSON.parse((await req('GET', '/api/tournament', { token: owner }))[1]);
t('week: Петро first with 240 XP in 2 rounds', [tour.week[0].nick, tour.week[0].xp, tour.week[0].rounds], '["Петро",240,2]');
t('week: Ana second with 200 XP, accuracy data', [tour.week[1]?.nick, tour.week[1]?.xp, tour.week[1]?.correct, tour.week[1]?.answered], '["Ana",200,50,60]');
t('week order is by XP', tour.week.map(r => r.nick).join(','), 'Петро,Ana');
t('Blitz A1: Петро 150 before Ana 120', tour.blitz.a1.map(r => `${r.nick}:${r.score}`).join(','), 'Петро:150,Ana:120');
t('Blitz A2 only has its own level', tour.blitz.a2.map(r => r.nick).join(','), 'Петро');
t('my row is marked', JSON.stringify(tour.week.find(r => r.nick === 'Ana')), '"me":true');
t('no e-mails in the tournament answer', JSON.stringify(tour).includes('@'), 'false');
t('week starts on a Monday', String(new Date(tour.weekStart + 'T12:00:00Z').getUTCDay()), '1');
t('tester cannot moderate', await req('POST', '/api/tournament/moderate', { token: anna, body: { email: 'owner@example.com', hidden: 1 } }), '403');
await req('POST', '/api/tournament/moderate', { token: owner, body: { email: 'anna@t.sk', hidden: 1 } });
tour = JSON.parse((await req('GET', '/api/tournament', { token: owner }))[1]);
t('hidden participant is not shown', tour.week.map(r => r.nick).join(','), 'Ana');
t('testers list shows nicks to the owner', await req('GET', '/api/testers', { token: owner }), '"anna@t.sk":{"nick":"Петро","hidden":true}');
await req('DELETE', '/api/testers', { token: owner, body: { email: 'anna@t.sk', lang: 'uk' } });
t('removed tester leaves the tournament', String(sql.prepare('SELECT COUNT(*) AS n FROM rounds WHERE email = ?').get('anna@t.sk').n), '0');
t('leave: nick "" deletes name and results', await req('POST', '/api/tournament/nick', { token: owner, body: { nick: '' } }), '"nick":""');
tour = JSON.parse((await req('GET', '/api/tournament', { token: owner }))[1]);
t('after leaving the tables are empty', String(tour.week.length + tour.blitz.a1.length), '0');

// task statistics: anonymous counters sent after a round; only the owner reads and clears them
const items = [
  { s: 'nouns', k: 'kniha', t: 'kniha · akuzatív', f: 'knihu', ok: false, g: 'kniha' },
  { s: 'nouns', k: 'kniha', t: 'kniha · akuzatív', f: 'knihu', ok: false, g: 'kniha' },
  { s: 'nouns', k: 'kniha', t: 'kniha · akuzatív', f: 'knihu', ok: true },
  { s: 'verbs', k: 'byť', t: 'byť · ja', f: 'som', ok: true },
  { s: 'Bad!', k: 'x', ok: false },                   // a bad section name is skipped
  { s: 'nums', k: 'n:5', t: 'x'.repeat(500), f: 'päť', ok: false, g: '<b>6</b>' },
];
t('stats: a tester sends a round', await req('POST', '/api/stats', { token: friend, body: { items } }), '"counted":8');
t('stats: a tester cannot read them', await req('GET', '/api/stats', { token: friend }), '403');
t('stats: a tester cannot clear them', await req('POST', '/api/stats/reset', { token: friend, body: {} }), '403');
let stats = JSON.parse((await req('GET', '/api/stats', { token: owner }))[1]);
const kniha = stats.items.find(x => x.key === 'kniha');
t('stats: wrong and right counted', `${kniha.bad}/${kniha.good}`, '2/1');
t('stats: the wrong answer given, counted', JSON.stringify(kniha.given), '[{"given":"kniha","n":2}]');
t('stats: the most missed task first', stats.items[0].key, 'kniha');
t('stats: only tasks with mistakes are listed', String(stats.items.some(x => x.key === 'byť')), 'false');
t('stats: long text is cut', String(stats.items.find(x => x.key === 'n:5').label.length), '200');
t('stats: no e-mails stored', JSON.stringify(sql.prepare('SELECT * FROM task_stats').all()).includes('@'), 'false');
await req('POST', '/api/stats/reset', { token: owner, body: { section: 'nouns' } });
stats = JSON.parse((await req('GET', '/api/stats', { token: owner }))[1]);
t('stats: clearing one section', stats.items.map(x => x.section).join(','), 'nums');

// crashes (www/js/core/errors.js): anonymous counters, the same crash summed; the owner reads and clears them
const crash = { m: 'x is not a function', f: 'js/games/engine.js', l: 120, v: '2.47.0', s: 'game', d: 'android' };
t('crash: a tester reports one', await req('POST', '/api/stats/error', { token: friend, body: crash }), '"counted":1');
await req('POST', '/api/stats/error', { token: friend, body: crash });
await req('POST', '/api/stats/error', { token: friend, body: { ...crash, d: 'ios', v: '2.46.0' } });
t('crash: an empty message is refused', await req('POST', '/api/stats/error', { token: friend, body: { f: 'x.js' } }), '400');
t('crash: a strange screen name is not kept', (await req('POST', '/api/stats/error', { token: friend, body: { m: 'boom', s: '<img>' } }), JSON.stringify(sql.prepare("SELECT screen FROM app_errors WHERE msg = 'boom'").all())), '[{"screen":""}]');
stats = JSON.parse((await req('GET', '/api/stats', { token: owner }))[1]);
const e1 = stats.errors.find(e => e.msg === crash.m);
t('crash: summed over versions and devices', `${e1.n} ${e1.devices.split(',').sort()} ${e1.versions.split(',').sort()}`, '3 android,ios 2.46.0,2.47.0');
t('crash: no e-mails stored', JSON.stringify(sql.prepare('SELECT * FROM app_errors').all()).includes('@'), 'false');
t('crash: a tester cannot read them', await req('GET', '/api/stats', { token: friend }), '403');
await req('POST', '/api/stats/reset', { token: owner, body: { section: 'errors' } });
stats = JSON.parse((await req('GET', '/api/stats', { token: owner }))[1]);
t('crash: cleared, the task statistics kept', `${stats.errors.length} ${stats.items.length > 0}`, '0 true');

// reminders by push: a device's push address and keys, the time and the time zone; the cron sends a payload encrypted for
// the device ({ t: 'daily' | 'soon' | 'over' }) signed with the VAPID key, each at most once; the end of the sign-in comes from Access
{
  const { remind } = await import(pathToFileURL(join(ROOT, 'worker', 'push.js')).href);
  t('push: off while there are no keys', await req('GET', '/api/push/key', { token: friend }), '503');
  const vp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  env.VAPID_PUBLIC = Buffer.from(await crypto.subtle.exportKey('raw', vp.publicKey)).toString('base64url');
  env.VAPID_PRIVATE = JSON.stringify(await crypto.subtle.exportKey('jwk', vp.privateKey));
  t('push: the public key', await req('GET', '/api/push/key', { token: friend }), env.VAPID_PUBLIC);
  // the "phone": its own key pair and auth secret, as a browser makes them for a subscription
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPub = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey)), authSecret = crypto.getRandomValues(new Uint8Array(16));
  const keys = { p256dh: Buffer.from(uaPub).toString('base64url'), auth: Buffer.from(authSecret).toString('base64url') };
  const hk = async (salt, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info },
    await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  async function decrypt(body) {  // what the phone does with an aes128gcm push (RFC 8291)
    const b = new Uint8Array(body), salt = b.slice(0, 16), idlen = b[20], as = b.slice(21, 21 + idlen), data = b.slice(21 + idlen);
    const asKey = await crypto.subtle.importKey('raw', as, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
    const te = new TextEncoder(), ikm = await hk(authSecret, shared, Buffer.concat([te.encode('WebPush: info\0'), uaPub, as]), 32);
    const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), data));
    return JSON.parse(new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2))));
  }
  const EP = 'https://fcm.googleapis.com/fcm/send/abc123', EP2 = 'https://web.push.apple.com/QXyz';
  t('push: an address outside the push services is refused', await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: 'https://evil.example/x', time: '19:00', tz: 'Europe/Bratislava' } }), '400');
  t('push: a time not offered is refused', await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP, time: '03:17', tz: 'Europe/Bratislava' } }), '400');
  t('push: a bad time zone is refused', await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP, time: '19:00', tz: 'Mars/Base' } }), '400');
  t('push: subscribe — the end of the sign-in comes back', await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP, keys, time: '19:00', tz: 'Europe/Bratislava', day: '' } }), `"exp":${exp * 1000}`);
  t('push: subscribe without the header is refused', await req('POST', '/api/push/subscribe', { token: friend, hdr: false, body: { endpoint: EP2, time: '19:00', tz: 'Europe/Kyiv' } }), '403');
  await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP2, time: '20:00', tz: 'Europe/Kyiv', day: '' } });  // an old device: no keys
  t('push: no e-mail stored', JSON.stringify(sql.prepare('SELECT * FROM push_subs').all()).includes('@'), 'false');
  // the sign-in of both ends far away for the daily tests (the test token ends in 10 minutes)
  sql.prepare('UPDATE push_subs SET session_exp = ?').run(Date.UTC(2027, 0, 1));
  const pushes = [], orig = globalThis.fetch;
  let pushStatus = 201;
  globalThis.fetch = async (url, init = {}) => {
    if (/fcm\.googleapis|push\.apple/.test(String(url))) { pushes.push({ url: String(url), auth: init.headers.Authorization, body: init.body, enc: init.headers['Content-Encoding'] }); return new Response(null, { status: pushStatus }); }
    return orig(url, init);
  };
  // 2026-11-02: 18:05 UTC = 19:05 in Bratislava (winter time) = 20:05 in Kyiv
  const at = Date.UTC(2026, 10, 2, 18, 5);
  let r = await remind(env, Date.UTC(2026, 10, 2, 17, 50));
  t('push: nobody before the time', `${r.sent}/${pushes.length}`, '0/0');
  r = await remind(env, at);
  t('push: both reminded at their own local time', `${r.sent}/${pushes.length}`, '2/2');
  const [h, p, s] = pushes[0].auth.slice('vapid t='.length).split(',')[0].split('.');
  const okSig = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vp.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${p}`));
  t('push: the VAPID token is signed with our key', String(okSig), 'true');
  t('push: the token is for the push service', JSON.parse(Buffer.from(p, 'base64url')).aud, 'https://fcm.googleapis.com');
  t('push: encrypted for the phone (aes128gcm)', pushes[0].enc, 'aes128gcm');
  t('push: the phone reads "daily"', (await decrypt(pushes[0].body)).t, 'daily');
  t('push: an old device without keys gets an empty push', String(pushes[1].body), 'null');
  r = await remind(env, at + 15 * 60e3);
  t('push: only once a day', String(r.sent), '0');
  await req('POST', '/api/push/done', { token: friend, body: { endpoint: EP, day: '2026-11-03' } });
  r = await remind(env, at + 24 * 3600e3);
  t('push: not when the daily training is done today', `${r.sent} ${pushes.at(-1).url}`, `1 ${EP2}`);
  r = await remind(env, at + 48 * 3600e3 + 4 * 3600e3);
  t('push: not more than 3 hours late', String(r.sent), '0');
  // the end of the sign-in: Thursday 2026-11-05 at 14:00 in Bratislava (13:00 UTC)
  const end = Date.UTC(2026, 10, 5, 13, 0);
  sql.prepare('UPDATE push_subs SET session_exp = ?, last_day = ? WHERE endpoint = ?').run(end, '2026-11-04', EP);
  sql.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(EP2);
  pushes.length = 0;
  r = await remind(env, Date.UTC(2026, 10, 4, 8, 50));  // 9:50 the day before
  t('push: not before 10:00 the day before', String(r.sent), '0');
  r = await remind(env, Date.UTC(2026, 10, 4, 9, 5));   // 10:05 the day before
  t('push: at 10:00 the day before — "tomorrow the code"', (await decrypt(pushes.at(-1).body)).t, 'soon');
  t('push: it says when the sign-in ends', String((await decrypt(pushes.at(-1).body)).at), String(end));
  r = await remind(env, Date.UTC(2026, 10, 4, 9, 20));
  t('push: "tomorrow" only once', String(r.sent), '0');
  r = await remind(env, Date.UTC(2026, 10, 5, 13, 15));  // 14:15, just after the end
  t('push: after the end — "sign in again"', (await decrypt(pushes.at(-1).body)).t, 'over');
  r = await remind(env, Date.UTC(2026, 10, 5, 13, 30));
  t('push: "ended" only once (and no daily reminder over it)', String(r.sent), '0');
  // a new sign-in before the end: the app sends the new end, no "ended" reminder
  sql.prepare('UPDATE push_subs SET session_exp = ?, sent_soon = 0, sent_over = 0 WHERE endpoint = ?').run(end, EP);
  await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP, keys, time: '19:00', tz: 'Europe/Bratislava', day: '2026-11-05' } });
  r = await remind(env, Date.UTC(2026, 10, 5, 13, 15));
  t('push: renewed — no "ended" reminder', String(r.sent), '0');
  pushStatus = 410;
  sql.prepare('UPDATE push_subs SET session_exp = ?, last_day = ? WHERE endpoint = ?').run(Date.UTC(2027, 0, 1), '', EP);
  await remind(env, at + 72 * 3600e3);
  t('push: a device that unsubscribed is forgotten', String(sql.prepare('SELECT COUNT(*) AS n FROM push_subs').get().n), '0');
  pushStatus = 201;
  await req('POST', '/api/push/subscribe', { token: friend, body: { endpoint: EP, keys, time: '19:00', tz: 'Europe/Bratislava', day: '' } });
  t('push: unsubscribe deletes the row', await req('POST', '/api/push/unsubscribe', { token: friend, body: { endpoint: EP } }), '"ok":true');
  t('push: nothing left', String(sql.prepare('SELECT COUNT(*) AS n FROM push_subs').get().n), '0');
  globalThis.fetch = orig;
}

console.log(fails ? `\nСервер: ${fails} из ${total} проверок не прошли.` : `Сервер: все ${total} проверок пройдены.`);
process.exit(fails ? 1 : 0);
