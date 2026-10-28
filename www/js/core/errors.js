/*!
 * E4U — automatic anonymous reports of crashes (the owner sees them in "Mistakes in tasks" → crashes)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * An error nobody caught (window "error", "unhandledrejection") is sent to worker/stats.js: the message, the file and
 * line of the program, the screen, the version and the kind of device. No e-mail, no name, no progress.
 * At most MAX different errors per start; network failures and an ended sign-in are not crashes and are not sent.
 */
import { APP } from '../config.js';
import { currentScreen } from './router.js';

const MAX = 3, seen = new Set();
const NOT_A_CRASH = /^(Script error\.?|Failed to fetch|Load failed|NetworkError.*|auth|server|net|The user aborted a request\.?|AbortError.*)$/i;
const device = () => (/Android/i.test(navigator.userAgent) ? 'android'
  : /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'desktop');
// the program file only (js/games/engine.js), never a query string
const fileOf = src => String(src || '').replace(location.origin, '').replace(/^\//, '').split(/[?#]/)[0].slice(0, 100);

function report(message, src, line) {
  // "Uncaught Error: x" (Chrome's wording) → "Error: x"
  const m = String(message || '').replace(/\s+/g, ' ').trim().replace(/^Uncaught (\(in promise\) )?/, '').slice(0, 200);
  if (!m || NOT_A_CRASH.test(m) || seen.size >= MAX) return;
  const f = fileOf(src), key = `${m}|${f}|${line}`;
  if (seen.has(key)) return;
  seen.add(key);
  let screen = '';
  try { screen = currentScreen().name || ''; } catch (e) { /* before the router started */ }
  fetch('api/stats/error', {
    method: 'POST', credentials: 'same-origin', redirect: 'manual', keepalive: true,
    headers: { 'Content-Type': 'application/json', 'X-E4U': '1' },
    body: JSON.stringify({ m, f, l: Number(line) || 0, v: APP.version, s: screen, d: device() }),
  }).catch(() => {});
}

/** From a stack trace: the first place in our own files (…/js/x.js:12:5). */
function placeOf(stack) {
  const hit = String(stack || '').split('\n').map(s => s.match(/(https?:\/\/[^\s)]+?):(\d+):\d+/)).find(x => x && x[1].startsWith(location.origin));
  return hit ? [hit[1], hit[2]] : ['', 0];
}

export function initErrors() {
  addEventListener('error', e => { if (e.message) report(e.message, e.filename, e.lineno); });
  addEventListener('unhandledrejection', e => {
    const r = e.reason;
    if (!r) return;
    const [f, l] = placeOf(r.stack);
    report(r.message || String(r), f, l);
  });
}
