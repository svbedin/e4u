/*!
 * E4U — task statistics for the author: which tasks testers get wrong, and what they answer instead
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Anonymous shared counters (worker/schema.sql: task_stats, task_given): no e-mail, no name, only how often
 * a task was answered right / wrong and which wrong answers were given. They help to find hard places and
 * mistakes in the data (a "wrong" answer given often may in fact be right).
 * POST /api/stats { items: [{ s, k, t, f, ok, g }] } → counted (any signed-in tester; at most 60 items)
 * GET  /api/stats → { items: [{ section, key, label, answer, good, bad, last, given: [{ given, n }] }], total } (owner)
 * POST /api/stats/reset { section } → the counters of a section (or all, section '') are cleared (owner)
 * POST /api/stats/error { m, f, l, v, s, d } → a crash counted (any signed-in tester; www/js/core/errors.js)
 *      the owner's GET /api/stats also gives { errors: [...] }; reset with section 'errors' (or '') clears them
 */
const MAX_ITEMS = 60, TOP = 150, MAX_ERRORS = 500;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
// short plain text: no control characters, at most n characters
const text = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export async function statsApi(request, env, path, admin) {
  if (!env.DB) return json({ error: 'off' }, 503);

  if (path === '/api/stats' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, MAX_ITEMS);
    const now = Date.now(), stmts = [];
    for (const it of items) {
      const section = /^[a-z]{2,20}$/.test(it && it.s) ? it.s : null, key = text(it && it.k, 120);
      if (!section || !key) continue;
      const ok = !!it.ok;
      stmts.push(env.DB.prepare(`INSERT INTO task_stats (section, key, label, answer, good, bad, last) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(section, key) DO UPDATE SET label = excluded.label, answer = excluded.answer,
          good = good + excluded.good, bad = bad + excluded.bad, last = excluded.last`)
        .bind(section, key, text(it.t, 200), text(it.f, 200), ok ? 1 : 0, ok ? 0 : 1, now));
      const given = text(it.g, 200);
      if (!ok && given) stmts.push(env.DB.prepare(`INSERT INTO task_given (section, key, given, n) VALUES (?, ?, ?, 1)
        ON CONFLICT(section, key, given) DO UPDATE SET n = n + 1`).bind(section, key, given));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, counted: stmts.length });
  }

  if (path === '/api/stats/error' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const msg = text(b.m, 200), file = text(b.f, 100), line = Math.max(0, Math.min(1e6, Number(b.l) | 0));
    const version = /^[0-9.]{1,12}$/.test(b.v) ? b.v : '?', screen = /^[a-z]{1,20}$/.test(b.s) ? b.s : '', device = ['android', 'ios', 'desktop'].includes(b.d) ? b.d : '';
    if (!msg) return json({ error: 'bad' }, 400);
    try {
      // a new kind of crash is kept only while the table is small (no flood); a known one is always counted
      const known = await env.DB.prepare('SELECT 1 FROM app_errors WHERE msg = ? AND file = ? AND line = ? AND version = ? AND screen = ? AND device = ?')
        .bind(msg, file, line, version, screen, device).first();
      if (!known && (await env.DB.prepare('SELECT COUNT(*) AS n FROM app_errors').first()).n >= MAX_ERRORS) return json({ ok: true, counted: 0 });
      const now = Date.now();
      await env.DB.prepare(`INSERT INTO app_errors (msg, file, line, version, screen, device, n, first, last) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(msg, file, line, version, screen, device) DO UPDATE SET n = n + 1, last = excluded.last`)
        .bind(msg, file, line, version, screen, device, now, now).run();
      return json({ ok: true, counted: 1 });
    } catch (e) { return json({ ok: false, error: 'no_table' }); }  // worker/migrate-2.47.sql not applied yet
  }

  if (!admin) return json({ error: 'forbidden' }, 403);

  if (path === '/api/stats' && request.method === 'GET') {
    const items = (await env.DB.prepare(`SELECT section, key, label, answer, good, bad, last FROM task_stats
      WHERE bad > 0 ORDER BY bad DESC, (bad * 1.0 / (good + bad)) DESC LIMIT ?`).bind(TOP).all()).results;
    const given = (await env.DB.prepare('SELECT section, key, given, n FROM task_given ORDER BY n DESC').all()).results;
    for (const it of items) it.given = given.filter(g => g.section === it.section && g.key === it.key).slice(0, 3).map(g => ({ given: g.given, n: g.n }));
    const total = await env.DB.prepare('SELECT COUNT(*) AS tasks, SUM(good) AS good, SUM(bad) AS bad FROM task_stats').first();
    // crashes: the same message and place summed over versions, screens and devices; newest first
    const errors = await env.DB.prepare(`SELECT msg, file, line, SUM(n) AS n, MAX(last) AS last, GROUP_CONCAT(DISTINCT version) AS versions,
      GROUP_CONCAT(DISTINCT screen) AS screens, GROUP_CONCAT(DISTINCT device) AS devices FROM app_errors GROUP BY msg, file, line ORDER BY last DESC LIMIT 50`)
      .all().then(r => r.results).catch(() => []);
    return json({ items, total, errors });
  }

  if (path === '/api/stats/reset' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const section = /^[a-z]{2,20}$/.test(body.section) ? body.section : '';
    if (section === 'errors' || !section) await env.DB.prepare('DELETE FROM app_errors').run().catch(() => {});
    if (section === 'errors') return json({ ok: true });
    if (section) await env.DB.batch([env.DB.prepare('DELETE FROM task_stats WHERE section = ?').bind(section), env.DB.prepare('DELETE FROM task_given WHERE section = ?').bind(section)]);
    else await env.DB.batch([env.DB.prepare('DELETE FROM task_stats'), env.DB.prepare('DELETE FROM task_given')]);
    return json({ ok: true });
  }
  return json({ error: 'not_found' }, 404);
}
