/*!
 * E4U — tournament screen: this week's table and Blitz records among testers
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Talks to worker/tournament.js. Taking part needs a name (nick); the e-mail is never shown.
 * After every round engine.js calls sendRound(); the server keeps it only for participants.
 */
import { T } from '../core/i18n.js';
import { register, on, app, currentScreen } from '../core/router.js';
import { backBar, ICON } from '../core/ui.js';
import { esc } from '../core/util.js';
import { getProfile, LEVELS } from '../core/store.js';
import { signedIn, call } from './admin.js';

const S = { data: null, busy: false, err: '', tab: 'week', level: null, editing: false, leaving: false };
const ERR = { auth: 'authLost', nick_bad: 'nickBad', nick_taken: 'nickTaken' };
const day = iso => { const [, m, d] = iso.split('-'); return `${d}.${m}`; };

/** Card under the sections on the home screen (only in the published app: it needs the server). */
export const tournamentCard = () => signedIn()
  ? `<button class="sect" data-act="go" data-v="tournament"><span class="glyph">${ICON.trophy}</span><span class="grow"><b>${T('tournament')}</b><span class="sub">${T('tournamentD')}</span></span></button>` : '';

/** A finished round; the server stores it only if this player takes part. Offline: the round is simply not counted. */
export function sendRound(round) {
  if (signedIn()) call('POST', 'api/round', round).catch(() => {});
}

async function load(fn = () => call('GET', 'api/tournament')) {
  S.busy = true; S.err = ''; paint();
  try { S.data = await fn(); } catch (e) { S.err = T(ERR[e.message] || 'netErr'); }
  S.busy = false; paint();
}

register('tournament', () => {
  S.editing = false; S.leaving = false;
  if (!S.level) S.level = getProfile().level;
  paint();
  load();
});

function board(rows, value, extra) {
  if (!rows.length) return `<p class="note">${T('tEmpty')}</p>`;
  return `<ol class="board">${rows.map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="pos tab">${i + 1}</span>
    <span class="who"><b>${esc(r.nick)}</b>${extra ? `<small>${extra(r)}</small>` : ''}</span><span class="pts tab">${value(r)}</span></li>`).join('')}</ol>`;
}

function paint() {
  if (currentScreen().name !== 'tournament') return;
  const d = S.data, me = d ? d.me : null;
  const nickForm = `<form class="typebox" id="nickf" autocomplete="off"><div class="in">
      <input id="nicki" maxlength="20" placeholder="${T('tNickPh')}" aria-label="${T('tNickPh')}" value="${esc(me && me.nick || '')}" ${S.busy ? 'disabled' : ''}>
      <button class="go" type="submit" ${S.busy ? 'disabled' : ''}>${me && me.nick ? T('tSave') : T('tJoin')}</button></div></form>`;
  let mine = '';
  if (d && (!me.nick || S.editing)) mine = `${!me.nick ? `<p class="note">${T('tJoinD')}</p>` : ''}${nickForm}`;
  else if (d) mine = `<div class="row" style="border:0;padding:0"><span>${T('tYouAre')} <b>${esc(me.nick)}</b></span>
      <button class="pill" data-act="tedit">${T('tRename')}</button></div>${me.hidden ? `<p class="note">${T('tHiddenMe')}</p>` : ''}`;
  const tabs = `<div class="seg" role="group">${['week', 'blitz'].map(t =>
    `<button data-act="ttab" data-v="${t}" aria-pressed="${S.tab === t}">${T(t === 'week' ? 'tWeek' : 'tBlitz')}</button>`).join('')}</div>`;
  let table = '';
  if (d && S.tab === 'week') {
    table = `<p class="sub" style="margin:0">${T('tWeekFrom')} ${day(d.weekStart)} · ${T('tWeekReset')}</p>${board(d.week, r => `${r.xp} XP`,
      r => `${T('tRounds')}: ${r.rounds} · ${T('acc')}: ${r.answered ? Math.round(r.correct / r.answered * 100) : 0}%`)}`;
  } else if (d) {
    table = `<div class="seg" role="group">${LEVELS.map(l => `<button data-act="tlevel" data-v="${l}" aria-pressed="${S.level === l}">${l.toUpperCase()}</button>`).join('')}</div>
      ${board(d.blitz[S.level] || [], r => r.score)}`;
  }
  const leave = d && me.nick && !S.editing ? (S.leaving
    ? `<p class="note">${T('tLeaveSure')}</p><div class="row" style="border:0;padding:0;gap:8px">
        <button class="big ghost" data-act="tleaveno">${T('cancel')}</button><button class="big" style="background:var(--bad)" data-act="tleaveyes">${T('tLeaveYes')}</button></div>`
    : `<button class="linkbtn" data-act="tleave">${T('tLeave')}</button>`) : '';
  app().innerHTML = `<div class="screen">
    ${backBar('home')}
    <h1>${T('tournament')}</h1>
    ${S.err ? `<p class="note" role="alert" style="color:var(--bad);border-color:var(--bad)">${S.err}</p>` : ''}
    ${!d && S.busy ? `<p class="note">${T('loading')}</p>` : ''}
    ${mine}
    ${d ? tabs + table : ''}
    ${leave}
  </div>`;
  document.getElementById('nickf')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const nick = document.getElementById('nicki').value.trim();
    if (!nick || S.busy) return;
    load(async () => { await call('POST', 'api/tournament/nick', { nick }); S.editing = false; return call('GET', 'api/tournament'); });
  });
}

on('ttab', v => { S.tab = v; paint(); });
on('tlevel', v => { S.level = v; paint(); });
on('tedit', () => { S.editing = true; paint(); });
on('tleave', () => { S.leaving = true; paint(); });
on('tleaveno', () => { S.leaving = false; paint(); });
on('tleaveyes', () => {
  S.leaving = false;
  load(async () => { await call('POST', 'api/tournament/nick', { nick: '' }); return call('GET', 'api/tournament'); });
});
