/*!
 * E4U — admin screen: who may open the app (Cloudflare Access testers list)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Talks to worker/index.js. The server decides who is admin; this screen only
 * shows the link when /api/me says so. Locally (npm start) there is no API, so it stays hidden.
 */
import { T, LANGS, getLang } from '../core/i18n.js';
import { register, on, render, app, currentScreen } from '../core/router.js';
import { backBar } from '../core/ui.js';
import { esc } from '../core/util.js';

let me = null;                    // { email, admin } once known
const S = { data: null, busy: false, err: '', msg: '', lang: null };
const langLabel = l => (l === 'uk' ? 'UA' : l.toUpperCase());
// dates as numbers (24.10, 14:30): no plural endings to get wrong in four languages
const p2 = n => String(n).padStart(2, '0');
const day = t => { const d = new Date(t); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`; };
const dayTime = t => { const d = new Date(t); return `${day(t)}, ${p2(d.getHours())}:${p2(d.getMinutes())}`; };

/** One tester's status line: last visit and whether the 7-day access is still valid. */
function status(d, e) {
  const s = d.seen[e], inv = d.invited[e];
  if (!s) return { kind: 'never', text: T('notYet') + (inv ? ` · ${T('invited')} ${day(inv)}` : '') };
  const expired = s.exp < d.now;
  return { kind: expired ? 'expired' : 'active',
    text: `${T('lastSeen')} ${dayTime(s.seen)} · ${expired ? T('accessExpired') : T('accessTill')} ${day(s.exp)}` };
}
/** The tester's tournament name, with a hide / show switch for the owner. */
function nickLine(d, e) {
  const n = d.nicks && d.nicks[e];
  if (!n) return '';
  return `<small class="tstat">🏆 «${esc(n.nick)}»${n.hidden ? ` · ${T('tHidden')}` : ''}
    <button class="pill" style="margin-left:6px" data-act="tmod" data-v="${esc(e)}|${n.hidden ? 0 : 1}" ${S.busy ? 'disabled' : ''}>${T(n.hidden ? 'tShow' : 'tHide')}</button></small>`;
}
/** Most recent visit first; people who never signed in go last, newest invitation first. */
const byLastVisit = d => (a, b) => (d.seen[b]?.seen || 0) - (d.seen[a]?.seen || 0) || (d.invited[b] || 0) - (d.invited[a] || 0);

/** Ask the server once at start-up whether this user is the admin. */
export async function checkAdmin() {
  try {
    const r = await call('GET', 'api/me');
    me = r;
    // now the server is known: the tournament card (home), "Testers" and "write to the author" (settings) can appear
    if (['home', 'settings'].includes(currentScreen().name)) render();
  } catch { /* offline, local server or not signed in: no admin link */ }
}

/** True when the app runs behind the server (published version), so reports can be sent. */
export const signedIn = () => !!me;

export const adminLink = () => me && me.admin
  ? `<button class="linkbtn" data-act="go" data-v="testers">${T('testers')}</button>
     <button class="linkbtn" data-act="go" data-v="stats">${T('stT')}</button>` : '';

/** After a round: every answer, anonymously, for the author's task statistics (screens/stats.js). */
export function sendStats(items) {
  if (me && items && items.length) call('POST', 'api/stats', { items }).catch(() => {});
}

/** A request to the app's server (worker/): JSON in and out; throws Error('auth' | server error code). */
export async function call(method, path, body) {
  const res = await fetch(path, {
    method, redirect: 'manual', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json', 'X-E4U': '1' } : { 'X-E4U': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Access sends an expired session to its login page
  if (res.type === 'opaqueredirect' || res.status === 401) throw new Error('auth');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'server');
  return data;
}

const ERR = { auth: 'authLost', bad_email: 'badEmail', limit: 'limitFull', self: 'cantRemoveSelf' };
const errText = e => T(ERR[e.message] || 'netErr');

// what happened to the e-mail after adding or removing a tester
const MAIL = { sent: { invite: 'mailInvite', back: 'mailBack', removed: 'mailRemoved' }, off: 'mailOff', failed: 'mailFailed' };

async function load(fn) {
  S.busy = true; S.err = ''; S.msg = ''; paint();
  try {
    S.data = await fn();
    const m = S.data.mail && MAIL[S.data.mail];
    if (m) S.msg = T(typeof m === 'string' ? m : m[S.data.kind]);
  } catch (e) { S.err = errText(e); }
  S.busy = false; paint();
}

register('testers', () => {
  if (!me || !me.admin) { app().innerHTML = `<div class="screen">${backBar('settings')}</div>`; return; }
  paint();
  if (!S.data && !S.busy) load(() => call('GET', 'api/testers'));
});

function paint() {
  if (currentScreen().name !== 'testers') return;
  const d = S.data, list = d ? [...d.emails].sort(byLastVisit(d)) : [], lang = S.lang || getLang();
  const expired = d ? list.filter(e => status(d, e).kind === 'expired').length : 0;
  const typed = document.getElementById('addi')?.value || '';  // keep what was typed across repaints
  app().innerHTML = `<div class="screen">
    ${backBar('settings')}
    <div><h1>${T('testers')}</h1><p class="sub">${T('testersD')}${d ? ` · <b class="tab">${list.length} ${T('ofLimit')} ${d.limit}</b>` : ''}${
      expired ? ` · <b style="color:var(--warm)">${T('expiredN')}: ${expired}</b>` : ''}</p></div>
    <form class="typebox" id="addf" autocomplete="off"><div class="in">
      <input id="addi" type="email" inputmode="email" placeholder="${T('emailPh')}" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${T('emailPh')}" value="${esc(typed)}" ${S.busy ? 'disabled' : ''}>
      <button class="go" type="submit" ${S.busy ? 'disabled' : ''}>${T('addTester')}</button></div>
      <div class="row" style="border:0;padding:0"><small style="color:var(--muted);font-weight:700">${T('mailLang')}</small>
        <div class="langs" role="group" aria-label="${T('mailLang')}">${LANGS.map(l =>
          `<button type="button" data-act="mlang" data-v="${l}" aria-pressed="${l === lang}">${langLabel(l)}</button>`).join('')}</div></div></form>
    ${S.err ? `<p class="note" role="alert" style="color:var(--bad);border-color:var(--bad)">${S.err}</p>` : ''}
    ${S.msg ? `<p class="note" role="status" style="color:${d.mail === 'sent' ? 'var(--good)' : 'var(--warm)'}">${S.msg}</p>` : ''}
    <div class="mlist">${!d && S.busy ? `<p class="note">${T('loading')}</p>` : list.map(e => { const st = status(d, e); return `<div class="mitem tester ${st.kind}"><span style="min-width:0"><span style="color:var(--ink);overflow-wrap:anywhere">${esc(e)}${
      d.langs[e] ? ` <small style="color:var(--muted)">· ${langLabel(d.langs[e])}</small>` : ''}</span><small class="tstat">${st.text}</small>${nickLine(d, e)}</span>${
      d.admins.includes(e) ? `<span class="pill">${T('you')}</span>`
        : `<button class="pill" style="background:var(--bad-soft);color:var(--bad)" data-act="untester" data-v="${esc(e)}" ${S.busy ? 'disabled' : ''}>${T('removeT')}</button>`}</div>`; }).join('')}</div>
    <p class="note">${T('adminNote')}</p>
  </div>`;
  const f = document.getElementById('addf');
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = document.getElementById('addi').value.trim();
    if (v && !S.busy) load(async () => { const r = await call('POST', 'api/testers', { email: v, lang }); document.getElementById('addi').value = ''; return r; });
  });
}

on('mlang', v => { S.lang = v; paint(); });
// a tester added before e-mails existed has no stored language: the farewell goes in the screen's language
// moderation of tournament names: hide a participant from the tables (or show them again)
on('tmod', v => {
  const [email, hidden] = v.split('|');
  if (!S.busy) load(async () => { await call('POST', 'api/tournament/moderate', { email, hidden: +hidden }); return call('GET', 'api/testers'); });
});
on('untester', v => { if (!S.busy) load(() => call('DELETE', 'api/testers', { email: v, lang: S.lang || getLang() })); });
