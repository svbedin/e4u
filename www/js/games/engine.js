/*!
 * E4U — game engine (all modes, shared by every section)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Modes: quiz, tiles, type, blitz use section.question(); match uses section.matchSet().
 */
import { T } from '../core/i18n.js';
import { getProfile, save } from '../core/store.js';
import { beep } from '../core/sound.js';
import { ICON, levelBox, brandBar, sayButton, muteButton } from '../core/ui.js';
import { speak, isSpeaking } from '../core/speech.js';
import { normAnswer, stripDiacritics, fmtTime, shuf, esc } from '../core/util.js';
import { register, on, go, app, onLeave, currentScreen } from '../core/router.js';
import { getSection, sectionStateOf } from '../sections/registry.js';
import { reportButton, openReport } from '../screens/report.js';
import { sendRound } from '../screens/tournament.js';
import { sendStats } from '../screens/admin.js';

// fix = find the wrong word, then pick the right one; order = put the words of a phrase in order;
// translate / dialog = pick a whole phrase (q.wide); dict = dictation, letter by letter (q.letters)
export const MODES = ['quiz', 'tiles', 'type', 'match', 'blitz', 'fix', 'order', 'translate', 'dialog', 'dict'];
const DICT_TRIES = 3;  // wrong letters allowed in one dictation phrase
const ROUND = 12, LIVES = 3, BLITZ_MS = 60000, BLITZ_PENALTY = 3000;
// no "Next" button: the game moves on by itself; a wrong answer stays longer so the correct form can be read
const NEXT_OK_MS = 800, NEXT_NO_MS = 2200, TAP_GUARD_MS = 300;
// the next task waits until the spoken answer is over, then a short pause (at most SPEECH_WAIT_MS of waiting):
// otherwise a dictation would start saying the next task over the answer
const SPEECH_PAUSE_MS = 600, SPEECH_WAIT_MS = 8000;
// "Typing" uses one on-screen keyboard instead of the phone's own keyboard: QWERTY with the apostrophe
// (isn’t, I’m). A computer keyboard works too; ' and ’ count as the same.
const KB_ROWS = ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m ’ ⌫'];
const MAX_TYPED = 40;

let G = null, timerId = null;
onLeave(() => { clearInterval(timerId); if (G) clearTimeout(G.auto); });

/* ---------- start ---------- */
export function start(sectionId, mode, review = false) {
  // replaying from the results screen reuses its history entry, so Back still leads to the menu
  const nav = { replace: currentScreen().name === 'result' };
  const section = getSection(sectionId);
  G = { section, st: sectionStateOf(section), mode, review, i: 0, total: mode === 'blitz' ? Infinity : ROUND, lives: LIVES,
    score: 0, streak: 0, maxStreak: 0, right: 0, answered: 0, mistakes: [], q: null, locked: false,
    log: [] };  // every answer of the round, for the author's task statistics (sent anonymously at the end)
  // words with a mistake from earlier rounds come first in every new round (oldest first) until answered right;
  // the section takes them off this list as it asks them (owner's rule, 2.20.0)
  G.due = Object.keys(G.st.mist);
  G.seen = new Set();  // keys asked in this round: a section avoids asking them again (owner's wish, 2.23.0)
  if (section.roundStart) section.roundStart(G.st, { review });  // e.g. the daily training gathers mistakes from every section
  if (mode === 'match') {
    G.m = section.matchSet(G.st, { review, due: G.due });
    G.m.left = shuf(G.m.pairs.map((p, i) => i)); G.m.right = shuf(G.m.pairs.map((p, i) => i));
    G.m.done = new Set(); G.m.missed = new Set(); G.m.sel = null; G.m.errs = 0; G.m.t0 = Date.now();
    go('game', { section: sectionId }, nav);
    timerId = setInterval(() => { const el = document.getElementById('tm'); if (el) el.textContent = fmtTime(Date.now() - G.m.t0); }, 250);
    return;
  }
  if (mode === 'blitz') G.endAt = Date.now() + BLITZ_MS;
  nextQuestion(false);
  go('game', { section: sectionId }, nav);
  if (mode === 'blitz') timerId = setInterval(tick, 200);
}

function tick() {
  const el = document.getElementById('tm'), left = Math.max(0, G.endAt - Date.now());
  if (el) { el.textContent = Math.ceil(left / 1000) + T('sec'); el.classList.toggle('low', left < 10000); }
  if (left <= 0) { clearInterval(timerId); finish(); }
}

function nextQuestion(draw = true) {
  let q;
  try { q = G.section.question(G.mode, G.st, { review: G.review, prev: G.q, due: G.due, seen: G.seen }); }
  catch (e) {
    // no task can be made with these settings: end the round with its results instead of freezing (2.23.1)
    console.error(e);
    if (draw) { finish(); return; }
    throw e;
  }
  G.q = q;
  G.seen.add(G.q.key);
  G.locked = false; G.i++; G.shownAt = Date.now();
  if (draw) renderGame();
}
const mult = () => Math.min(4, 1 + Math.floor(G.streak / 3));

/* ---------- pieces ---------- */
const hearts = () => `<div class="hearts" aria-label="${G.lives}/${LIVES}">${[0, 1, 2].map(i => `<span class="${i < G.lives ? '' : 'off'}">${ICON.heart}</span>`).join('')}</div>`;
function topBar() {
  let prog = `<div class="progress"><span style="width:${(G.i - 1) / G.total * 100}%"></span></div>`, right = hearts();
  if (G.mode === 'blitz') { prog = '<div style="flex:1"></div>'; right = `<div class="timer tab" id="tm">${Math.ceil(Math.max(0, G.endAt - Date.now()) / 1000)}${T('sec')}</div>`; }
  if (G.mode === 'match') { prog = `<div class="progress"><span style="width:${G.m.done.size / G.m.pairs.length * 100}%"></span></div>`; right = `<div class="timer tab" id="tm">${fmtTime(Date.now() - G.m.t0)}</div>`; }
  return `<div class="gtop"><button class="iconbtn" data-act="quit" aria-label="${T('quit')}">${ICON.x}</button>${prog}${right}${muteButton()}${reportButton()}</div>`;
}

/** Say answers by itself: needs both "Pronunciation" and the sound on (the 🔊/🔇 in the top bar). */
const autoSay = () => { const P = getProfile(); return P.speak !== false && P.sound !== false; };

/** The current task as plain text, attached to a report. withAnswer=false is what the tester sees (no spoiler). */
const strip = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function gameContext(withAnswer = true) {
  const head = `${T(G.section.titleKey)} · ${T(G.mode)}`;
  if (G.mode === 'match') {
    const M = G.m;
    return [head, M.chips.map(c => strip(c.label)).join(' · '), `${strip(M.title)} — ${strip(M.subtitle)}`,
      ...(withAnswer ? M.pairs.map(p => `${strip(p.left)} → ${strip(p.right)}`) : [])].filter(Boolean).join('\n');
  }
  const q = G.q;
  return [head, q.chips.map(c => strip(c.label)).join(' · '), `${strip(q.title)} — ${strip(q.subtitle)}`,
    q.main ? strip(q.main(false)) : '', q.options ? q.options.map(o => strip(o.label)).join(' · ') : '',
    ...(withAnswer ? [`${T('answer')} ${strip(q.display)}`, `key: ${q.key}`] : [])].filter(Boolean).join('\n');
}
const hud = () => `<div class="hud"><span class="tab">${G.score} ${T('points')}</span><span class="combo ${G.streak ? '' : 'zero'}">${ICON.fire} <span class="tab">${G.streak}</span>${mult() > 1 ? ` · ×${mult()}` : ''}</span></div>`;
const chipHTML = c => `<span class="pill"${c.kind === 'ghost' ? ' style="background:transparent"' : c.kind === 'warm' ? ' style="background:var(--warm-soft);color:var(--warm)"' : ''}>${c.label}</span>`;
/** The task's chips, plus a mark when it is a word with an earlier mistake. */
const chipsHTML = q => (q.due ? [...q.chips, { label: T('dueTag'), kind: 'warm' }] : q.chips).map(chipHTML).join('');
function card(q, revealed, extra = '') {
  return `<div class="qcard" id="card"${extra}><div class="ornament"></div>
    <div class="tense">${chipsHTML(q)}</div>
    <div class="verb">${q.title}${sayButton(q.say ?? strip(q.title))}<span class="tr">${q.subtitle || ''}</span></div>${q.main ? q.main(revealed) : ''}</div>`;
}

/* ---------- game screen ---------- */
register('game', () => { if (!G) return go('home', {}, { replace: true }); G.mode === 'match' ? renderMatch() : renderGame(); });

const listenTools = () => `<div class="dtools"><button type="button" class="iconbtn" data-act="dsay" aria-label="${T('listen')}">${ICON.speaker}</button>
      <button type="button" class="iconbtn" data-act="dslow" aria-label="${T('slow')}" title="${T('slow')}">${ICON.slow}</button></div>`;
const isTyping = () => G && G.q && (G.mode === 'type' || G.q.keypad);

function renderGame() {
  const q = G.q; let input = '';
  if (G.mode === 'type' || q.keypad) {
    G.typed = '';
    const key = k => `<button type="button" data-act="key" data-v="${k}"${k === '⌫' ? ' class="bs" aria-label="Backspace"' : ''}>${k}</button>`;
    // q.keypad: digits only (a number heard in the dictation)
    input = `${q.listen ? listenTools() : ''}<div class="typed" id="ti" role="textbox" aria-label="${T('ph')}" aria-live="polite"></div>
      ${q.keypad
        ? `<div class="kb dk pad">${'1 2 3 4 5 6 7 8 9 ⌫ 0'.split(' ').map(key).join('')}<button type="button" class="go" data-act="key" data-v="enter">${T('check')}</button></div>`
        : `<div class="kb">${KB_ROWS.map((r, i) => `<div class="r">${r.split(' ').map(key).join('')}</div>`).join('')}
        <div class="r"><button type="button" class="wide" data-act="key" data-v=" ">${T('space')}</button><button type="button" class="go" data-act="key" data-v="enter">${T('check')}</button></div></div>`}`;
  } else if (q.order) {
    G.built = [];
    input = `<div class="built" id="built" aria-live="polite"></div><div class="opts words" id="bank"></div>`;
  } else if (q.letters) {
    G.dpos = q.letters.findIndex(l => !l.show); G.derr = 0;
    input = `${listenTools()}
      <div class="kb dk">${q.keys.map(k => `<button type="button" data-act="dk" data-v="${k}">${k}</button>`).join('')}</div>`;
  } else if (q.inCard) {
    input = '';  // the options are the words of the phrase on the card itself (find the mistake)
  } else {
    const tiles = G.mode === 'tiles';
    // q.words: the options are the words of a phrase, in one flowing line (find the mistake);
    // q.wide: each option is a whole phrase, one per row (translation, dialogue)
    input = `${q.hint && (tiles || q.words) ? `<p class="label" style="margin:0;text-align:center">${q.hint}</p>` : ''}<div class="opts${tiles ? ' tiles' : ''}${q.words ? ' words' : ''}${q.wide ? ' wide' : ''}">${q.options.map((o, i) => `<button class="opt" data-act="ans" data-v="${i}">${o.label}</button>`).join('')}</div>`;
  }
  app().innerHTML = `<div class="screen" id="gs">${topBar()}${hud()}${card(q, false)}${input}<div id="fb"></div></div>`;
  if (G.mode === 'type' || q.keypad) showTyped();
  if (q.order) showBuilt();
  if (q.letters) showDict();
  if (q.listen && autoSay()) speak(q.listen);  // a dictation: what is to be written is said at once
}

/* ---------- dictation: the phrase is said; tap its missing letters one by one ---------- */
function showDict() {
  const el = document.getElementById('dict'); if (!el) return;
  el.innerHTML = G.q.letters.map((l, i) => (l.show ? esc(l.c) : `<span class="dl${i === G.dpos ? ' cur' : ''}">_</span>`)).join('');
}
function dictKey(k) {
  if (!G || !G.q || !G.q.letters || G.locked || G.dpos < 0) return;
  const L = G.q.letters;
  if (L[G.dpos].c.toLowerCase() === k) {
    L[G.dpos].show = true; G.dpos = L.findIndex(l => !l.show); showDict();
    if (G.dpos < 0) resolve('ok');
    return;
  }
  G.derr++; beep('no');
  const c = document.getElementById('card'); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  if (G.derr >= DICT_TRIES) { L.forEach(l => { l.show = true; }); showDict(); resolve('no'); }
}

/* ---------- build the phrase: tap words in the bank to put them in the line, tap a word in the line to take it back ---------- */
function showBuilt() {
  const q = G.q, line = document.getElementById('built'), bank = document.getElementById('bank');
  if (!line || !bank) return;
  line.innerHTML = G.built.length ? G.built.map((t, i) => `<button class="opt" data-act="ob" data-v="${i}">${esc(q.order[t])}</button>`).join('')
    : `<span class="ph">${T('orderPh')}</span>`;
  bank.innerHTML = q.order.map((w, i) => `<button class="opt" data-act="ot" data-v="${i}"${G.built.includes(i) ? ' disabled style="visibility:hidden"' : ''}>${esc(w)}</button>`).join('');
}
function orderTap(kind, i) {
  if (!G || !G.q || !G.q.order || G.locked) return;
  if (kind === 'ot' && !G.built.includes(i)) G.built.push(i);
  if (kind === 'ob') G.built.splice(i, 1);
  showBuilt();
  if (G.built.length === G.q.order.length) {
    const said = G.built.map(t => G.q.order[t]).join(' ');
    const norm = s => normAnswer(s).replace(/[.?!]+$/, '');
    G.given = said;
    resolve(G.q.accepted.map(norm).includes(norm(said)) ? 'ok' : 'no');
  }
}

function showTyped() {
  const el = document.getElementById('ti');
  // the text sits in its own span: in the flex box a bare trailing space would be dropped and a typed space would not show
  if (el) el.innerHTML = G.typed ? `<span class="tx">${esc(G.typed)}</span><span class="caret"></span>` : `<span class="caret"></span><span class="ph">${T('ph')}</span>`;
  // a phrase with gaps: what is typed shows right in the gap being filled
  const gap = document.getElementById('gapcur');
  if (gap) gap.textContent = G.typed || ' ';
}

function typeKey(k) {
  if (!isTyping() || G.locked || currentScreen().name !== 'game') return;
  if (k === 'enter') { if (G.typed.trim()) judgeTyped(G.typed); return; }
  if (k === '⌫') G.typed = G.typed.slice(0, -1);
  else if (G.typed.length < MAX_TYPED && !(k === ' ' && (!G.typed || G.typed.endsWith(' ')))) G.typed += k;
  showTyped();
}

// a computer keyboard types into the same field (ignored while the report sheet is open)
document.addEventListener('keydown', ev => {
  if (!G || !G.q || !G.q.letters || currentScreen().name !== 'game' || document.getElementById('report')) return;
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && /^\p{L}$/u.test(ev.key)) { ev.preventDefault(); dictKey(ev.key.toLowerCase()); }
});
document.addEventListener('keydown', ev => {
  if (!isTyping() || currentScreen().name !== 'game' || document.getElementById('report')) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key === 'Backspace' ? '⌫' : ev.key === 'Enter' ? 'enter' : /^[\p{L}\p{N} '’]$/u.test(ev.key) ? ev.key.toLowerCase().replace("'", '’') : null;
  if (k) { ev.preventDefault(); typeKey(k); }
});

function judgeTyped(val) {
  G.given = val;
  const v = normAnswer(val), acc = G.q.accepted.map(normAnswer);
  if (acc.includes(v)) return resolve('ok');
  if (acc.map(stripDiacritics).includes(stripDiacritics(v))) return resolve(getProfile().strict ? 'no' : 'al');
  resolve('no');
}

function answerChoice(i) {
  if (G.locked || Date.now() - G.shownAt < TAP_GUARD_MS) return; // a late tap meant for the previous question
  const q = G.q, pickV = q.options[i].value, btns = app().querySelectorAll('[data-act="ans"]');
  btns.forEach((b, j) => { b.disabled = true; if (q.options[j].value === q.answer) b.classList.add('ok'); });
  if (pickV !== q.answer) btns[i].classList.add('no');
  G.given = q.options[i].label;
  resolve(pickV === q.answer ? 'ok' : 'no');
}

function resolve(kind) {
  // q.st: the task belongs to another section's progress (the daily training) — its mistakes go there
  const q = G.q, cardEl = document.getElementById('card'), mist = (q.st || G.st).mist;
  // a task in steps (a phrase with two gaps; find the mistake, then fix it): a right step leads to the next one,
  // the task is scored once, at its last step
  if ((kind === 'ok' || kind === 'al') && q.then) {
    beep('ok'); G.q = q.then(); G.shownAt = Date.now();
    setTimeout(() => { if (G && document.getElementById('gs')) renderGame(); }, 350);
    return;
  }
  G.locked = true; G.answered++;
  logAnswer(q, kind !== 'no', G.given); G.given = null;
  if (kind === 'ok' || kind === 'al') {
    G.streak++; G.maxStreak = Math.max(G.maxStreak, G.streak); G.right++;
    G.score += Math.round((G.mode === 'blitz' ? 5 : 10) * mult() * (kind === 'al' ? 0.5 : 1));
    cardEl && cardEl.classList.add('pop'); beep('ok');
    delete mist[q.key];  // one right answer takes the word off the "mistakes" list
  } else {
    G.streak = 0; cardEl && cardEl.classList.add('shake'); beep('no');
    G.mistakes.push(q.mistake); mist[q.key] = (mist[q.key] || 0) + 1;
    if (G.mode === 'blitz') G.endAt -= BLITZ_PENALTY; else G.lives--;
  }
  save();  // the mistakes list is kept even if the round is left halfway
  if (cardEl && G.mode === 'tiles') cardEl.outerHTML = card(q, true);
  // say the correct form, so the ear learns it (not in Blitz: too fast there)
  // q.sayAfter: only the English answer, when the shown answer has more (a translation, digits, ↔)
  if (autoSay() && G.mode !== 'blitz') speak(q.sayAfter ?? q.display);
  const h = app().querySelector('.hud'); if (h) h.outerHTML = hud();
  const hs = app().querySelector('.hearts'); if (hs) hs.outerHTML = hearts();

  if (G.mode === 'blitz') { setTimeout(() => { if (G && G.mode === 'blitz' && Date.now() < G.endAt && document.getElementById('gs')) nextQuestion(); }, kind === 'ok' ? 350 : 900); return; }
  const title = kind === 'ok' ? T('ok') : kind === 'al' ? T('al') : T('no');
  document.getElementById('fb').innerHTML = `<div class="feedback ${kind}" role="status"><h3>${title}</h3>${kind !== 'ok' ? `<p>${T('answer')} <b>${q.display}</b></p>` : ''}</div>`;
  const until = Date.now() + SPEECH_WAIT_MS;
  let heard = false;  // the pause only after something was said (no voice: no pause)
  const next = () => {
    if (!G || !G.locked || !document.getElementById('gs')) return;
    if (isSpeaking() && Date.now() < until) { heard = true; G.auto = setTimeout(next, 150); return; }
    G.auto = setTimeout(() => { if (G && G.locked && document.getElementById('gs')) advance(); }, heard ? SPEECH_PAUSE_MS : 0);
  };
  G.auto = setTimeout(next, kind === 'ok' ? NEXT_OK_MS : NEXT_NO_MS);
  document.getElementById('fb').scrollIntoView({ block: 'end', behavior: 'smooth' });
}

/** One answer for the statistics: the task (its section: q.sid in the daily training), right or not, and what was answered. */
function logAnswer(q, ok, given = '') {
  if (!G.log || G.log.length >= 60) return;
  G.log.push({ s: q.sid || G.section.id, k: q.key, t: strip(q.mistake ? q.mistake.text : q.title), f: strip(q.mistake ? q.mistake.form : q.display),
    ok, g: ok ? '' : strip(given) });
}

function advance() { clearTimeout(G.auto); if (G.lives <= 0 || G.i >= G.total) finish(); else nextQuestion(); }

/* ---------- match ---------- */
function renderMatch() {
  const M = G.m;
  app().innerHTML = `<div class="screen">${topBar()}
    <div class="qcard" style="min-height:0;flex:none;padding:18px 14px"><div class="ornament"></div>
      <div class="tense">${chipsHTML(M)}</div>
      <div class="verb" style="font-size:22px">${M.title}${sayButton(M.say ?? strip(M.title))}<span class="tr">${M.subtitle || ''}</span></div><p class="label" style="margin:0">${M.hint}</p></div>
    <div class="match"><div class="col">${M.left.map(i => `<button class="opt ${M.done.has(i) ? 'ok done' : ''} ${M.sel === i ? 'sel' : ''}" data-act="ml" data-v="${i}" ${M.done.has(i) ? 'disabled' : ''}>${M.pairs[i].left}</button>`).join('')}</div>
    <div class="col">${M.right.map(i => `<button class="opt ${M.done.has(i) ? 'ok done' : ''}" data-act="mr" data-v="${i}" ${M.done.has(i) ? 'disabled' : ''}>${M.pairs[i].right}</button>`).join('')}</div></div>
    <div class="hud"><span>${T('errors')}: <b class="tab">${M.errs}</b></span><span class="tab">${M.done.size}/${M.pairs.length}</span></div></div>`;
}
function matchPick(side, i) {
  const M = G.m;
  if (side === 'l') { M.sel = i; renderMatch(); return; }
  if (M.sel == null) return;
  const L = M.pairs[M.sel], R = M.pairs[i];
  // a pair may carry its own word (nouns: six words); otherwise the whole set is one word (a verb)
  const key = L.key ?? M.key;
  if (M.sel === i || L.right === R.right) {
    if (!M.missed.has(M.sel)) logAnswer({ key: key, mistake: L.mistake }, true);
    if (L.key && !M.missed.has(M.sel)) { delete G.st.mist[L.key]; save(); }
    M.done.add(M.sel); M.sel = null; beep('ok'); renderMatch();
    if (autoSay()) speak(strip(L.right));
  }
  else {
    if (!M.missed.has(M.sel)) logAnswer({ key: key, mistake: L.mistake }, false, R.right);
    M.errs++; M.missed.add(M.sel); beep('no'); G.mistakes.push(L.mistake); G.st.mist[key] = (G.st.mist[key] || 0) + 1; save();
    renderMatch(); const b = app().querySelector(`[data-act="mr"][data-v="${i}"]`); b && b.classList.add('no'); return;
  }
  if (M.done.size >= M.pairs.length) {
    if (!M.errs) delete G.st.mist[M.key];  // the whole set without a mistake: its word is learned
    clearInterval(timerId); G.matchMs = Date.now() - M.t0; setTimeout(finish, 350);
  }
}

/* ---------- results ---------- */
function finish() {
  clearInterval(timerId);
  const P = getProfile(), best = G.st.best;
  let headline, stats, isBest = false, gained;
  if (G.mode === 'match') {
    const ms = G.matchMs || 0, errs = G.m.errs;
    gained = Math.max(10, 60 - errs * 10 - Math.floor(ms / 5000));
    if (errs === 0 && (best.match == null || ms < best.match)) { best.match = ms; isBest = true; }
    headline = fmtTime(ms);
    stats = [[errs, T('errors')], ['+' + gained, 'XP'], [best.match != null ? fmtTime(best.match) : '—', T('best')]];
  } else {
    gained = G.score;
    if (G.score > 0 && (best[G.mode] == null || G.score > best[G.mode])) { best[G.mode] = G.score; isBest = true; }
    headline = G.score;
    const acc = G.answered ? Math.round(G.right / G.answered * 100) : 0;
    stats = [[acc + '%', T('acc')], [G.maxStreak, T('bstreak')], ['+' + gained, 'XP']];
  }
  P.xp += gained; P.bestStreak = Math.max(P.bestStreak, G.maxStreak);
  if (G.section.onFinish) G.section.onFinish(G.st);  // e.g. the daily training: done today, days in a row
  save();
  // the tournament counts the round (the server keeps it only for players who joined)
  const M = G.m, match = G.mode === 'match';
  sendStats(G.log);
  sendRound({ section: G.section.id, mode: G.mode, level: P.level, xp: gained, score: match ? gained : G.score,
    answered: match ? M.pairs.length + M.errs : G.answered, correct: match ? M.pairs.length : G.right });
  if (isBest || G.mistakes.length === 0) beep('win');
  G.res = { headline, stats, isBest };
  go('result', { section: G.section.id }, { replace: true });
}

register('result', () => {
  if (!G || !G.res) return go('home', {}, { replace: true });
  const R = G.res, uniq = [];
  G.mistakes.forEach(m => { if (!uniq.some(u => u.text === m.text && u.form === m.form)) uniq.push(m); });
  return `<div class="screen">${brandBar()}
    <div class="result-hero"><div class="ornament" style="width:100%"></div><span class="label">${T('done')} · ${T(G.mode)}</span>
      <div class="score tab">${R.headline}</div><span class="label">${G.mode === 'match' ? T('time') : T('points')}</span>
      ${R.isBest ? `<span class="newbest">${T('newbest')}</span>` : ''}
      <div class="stats">${R.stats.map(s => `<div><strong class="tab">${s[0]}</strong><span>${s[1]}</span></div>`).join('')}</div></div>
    ${levelBox()}
    <div class="group"><span class="label">${T('mistakes')}</span>
      ${uniq.length ? `<div class="mlist">${uniq.map(m => `<div class="mitem"><span>${m.text}</span><b>${m.form}</b></div>`).join('')}</div>` : `<p class="note">${T('noMist')}</p>`}</div>
    <div class="actions">
      ${uniq.length ? `<button class="big" data-act="review">${T('review')}</button>` : ''}
      <button class="big ${uniq.length ? 'ghost' : ''}" data-act="play" data-v="${G.section.id}:${G.mode}">${T('again')}</button>
      <button class="big ghost" data-act="back">${T('menu')}</button></div></div>`;
});

/* ---------- actions ---------- */
on('play', v => { const [s, m] = v.split(':'); start(s, m); });
on('review', () => start(G.section.id, G.mode === 'match' ? 'quiz' : G.mode, true));
on('quit', () => history.back()); // the game entry falls back to the section menu
on('ans', v => answerChoice(+v));
on('key', v => typeKey(v));
on('report', () => { if (G) openReport(gameContext(), gameContext(false)); });
on('dk', v => dictKey(v));
on('dsay', () => { if (G && G.q && G.q.listen) speak(G.q.listen); });
on('dslow', () => { if (G && G.q && G.q.listen) speak(G.q.listen, true); });
on('ot', v => orderTap('ot', +v));
on('ob', v => orderTap('ob', +v));
on('ml', v => matchPick('l', +v));
on('mr', v => matchPick('r', +v));

document.addEventListener('keydown', ev => {
  if (!G || !document.getElementById('gs')) return;
  if (!isTyping() && !G.locked && /^[1-6]$/.test(ev.key)) { const i = +ev.key - 1; if (G.q.options && i < G.q.options.length) answerChoice(i); }
  else if (G.locked && ev.key === 'Enter' && G.mode !== 'blitz' && !ev.target.closest('button')) { ev.preventDefault(); advance(); }
});

