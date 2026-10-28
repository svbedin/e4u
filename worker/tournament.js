/*!
 * E4U — tournament among testers: weekly XP table and Blitz records (Cloudflare D1, worker/schema.sql)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Taking part is voluntary: only people who set a nick are stored and shown; others see the nick, never the e-mail.
 * GET  /api/tournament                → { me: { nick }, weekStart, week: [...], blitz: { a1: [...], a2: [...] } }
 * POST /api/tournament/nick { nick }  → join or rename; nick '' = leave (name and results are deleted)
 * POST /api/round { section, mode, level, xp, score, answered, correct } → counted if the sender takes part
 * POST /api/tournament/moderate { email, hidden } (owner) → hide or show a participant
 */
const NICK = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,18}[\p{L}\p{N}]$/u;  // 2–20 characters, letters and digits at both ends
const LEVELS = ['a1', 'a2'];
const MAX_XP = 2000, MAX_ANSWERS = 300;  // more than one round can give: anything above is not a real round
const TOP = 50;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

/** Monday of the week (Bratislava time) as 'YYYY-MM-DD': the weekly table starts there. */
export function weekStart(ts = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
    .formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  d.setUTCDate(d.getUTCDate() - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday));
  return d.toISOString().slice(0, 10);
}

const player = (env, email) => env.DB.prepare('SELECT nick, hidden FROM players WHERE email = ?').bind(email).first();

export async function tournamentApi(request, env, path, email, admin) {
  if (!env.DB) return json({ error: 'off' }, 503);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  if (path === '/api/tournament' && request.method === 'GET') {
    const me = await player(env, email), week = weekStart();
    const mark = rows => rows.map(r => ({ nick: r.nick, ...r, email: undefined, me: r.email === email }));
    const weekRows = (await env.DB.prepare(
      `SELECT p.nick, p.email, SUM(r.xp) AS xp, COUNT(*) AS rounds, SUM(r.correct) AS correct, SUM(r.answered) AS answered
         FROM rounds r JOIN players p ON p.email = r.email
        WHERE r.week = ? AND p.hidden = 0 GROUP BY r.email ORDER BY xp DESC, rounds DESC LIMIT ?`).bind(week, TOP).all()).results;
    const blitz = {};
    for (const level of LEVELS) {
      blitz[level] = mark((await env.DB.prepare(
        `SELECT p.nick, p.email, MAX(r.score) AS score FROM rounds r JOIN players p ON p.email = r.email
          WHERE r.mode = 'blitz' AND r.level = ? AND p.hidden = 0 GROUP BY r.email ORDER BY score DESC LIMIT ?`).bind(level, TOP).all()).results);
    }
    return json({ me: { nick: me ? me.nick : '', hidden: !!(me && me.hidden) }, weekStart: week, week: mark(weekRows), blitz });
  }

  if (path === '/api/tournament/nick' && request.method === 'POST') {
    const nick = String(body.nick || '').trim().replace(/\s+/g, ' ');
    if (!nick) { await leave(env, email); return json({ ok: true, nick: '' }); }
    if (!NICK.test(nick)) return json({ error: 'nick_bad' }, 400);
    const taken = await env.DB.prepare('SELECT email FROM players WHERE nick_key = ?').bind(nick.toLowerCase()).first();
    if (taken && taken.email !== email) return json({ error: 'nick_taken' }, 409);
    await env.DB.prepare(`INSERT INTO players (email, nick, nick_key, joined) VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET nick = excluded.nick, nick_key = excluded.nick_key`).bind(email, nick, nick.toLowerCase(), Date.now()).run();
    return json({ ok: true, nick });
  }

  if (path === '/api/round' && request.method === 'POST') {
    if (!await player(env, email)) return json({ ok: true, counted: false });  // not taking part: nothing is stored
    const n = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const word = (v, ok) => (ok.test(String(v || '')) ? String(v) : null);
    const section = word(body.section, /^[a-z]{2,20}$/), mode = word(body.mode, /^[a-z]{2,20}$/), level = LEVELS.includes(body.level) ? body.level : null;
    if (!section || !mode || !level) return json({ error: 'bad_round' }, 400);
    const xp = Number(body.xp) || 0, score = Number(body.score) || 0;
    if (xp > MAX_XP || score > MAX_XP || xp < 0 || score < 0) return json({ error: 'bad_round' }, 400);
    const answered = n(body.answered, MAX_ANSWERS), correct = Math.min(n(body.correct, MAX_ANSWERS), answered);
    await env.DB.prepare('INSERT INTO rounds (email, ts, week, section, mode, level, xp, score, answered, correct) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(email, Date.now(), weekStart(), section, mode, level, Math.round(xp), Math.round(score), answered, correct).run();
    return json({ ok: true, counted: true });
  }

  if (path === '/api/tournament/moderate' && request.method === 'POST') {
    if (!admin) return json({ error: 'forbidden' }, 403);
    const who = String(body.email || '').trim().toLowerCase();
    await env.DB.prepare('UPDATE players SET hidden = ? WHERE email = ?').bind(body.hidden ? 1 : 0, who).run();
    return json({ ok: true });
  }
  return json({ error: 'not_found' }, 404);
}

/** Leave the tournament (or be removed from the testers): the name and every round are deleted. */
export async function leave(env, email) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rounds WHERE email = ?').bind(email),
    env.DB.prepare('DELETE FROM players WHERE email = ?').bind(email),
  ]);
}

/** { email: { nick, hidden } } of these people, for the owner's testers list. */
export async function nicksOf(env, emails) {
  if (!env.DB || !emails.length) return {};
  const rows = (await env.DB.prepare(`SELECT email, nick, hidden FROM players WHERE email IN (${emails.map(() => '?').join(',')})`).bind(...emails).all()).results;
  return Object.fromEntries(rows.map(r => [r.email, { nick: r.nick, hidden: !!r.hidden }]));
}
