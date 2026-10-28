/*!
 * E4U — section "Phrases" (A1): fill the gaps, find the mistake, build the phrase
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. Phrases and their wrong forms live in data.js;
 * a task with several steps (two gaps; find the word, then fix it) uses the engine's q.then.
 */
import { RAW, DIALOGS as DRAW } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { sayButton } from '../../core/ui.js';
import { canSpeak } from '../../core/speech.js';
import { getProfile } from '../../core/store.js';

/** "Where {are|you · be|is,am} you from?" → parts: text, or a gap { a: answer, h: hint, w: wrong forms } */
function parse(s) {
  const parts = [];
  s.split(/(\{[^}]*\})/).forEach(x => {
    if (!x) return;
    if (x[0] !== '{') { parts.push(x); return; }
    const [a, h, w] = x.slice(1, -1).split('|');
    parts.push({ a, h: h || '', w: (w || '').split(',').filter(Boolean) });
  });
  return parts;
}
const fill = (parts, put = g => g.a) => parts.map((p, i) => (typeof p === 'string' ? p : put(p, i))).join('');

export const PHRASES = RAW.map(([topic, en, ru, uk, sk, order]) => {
  const parts = parse(en), full = fill(parts);
  return { key: full, topic, parts, full, gaps: parts.filter(p => typeof p !== 'string'), t: { ru, uk, sk },
    alts: order === '-' ? null : [full, ...order.split(' / ').map(s => s.trim()).filter(Boolean)] };
});

export const DIALOGS = DRAW.map(([topic, line, reply, wrong, ru, uk, sk]) =>
  ({ key: 'd:' + line, topic, line, reply, wrong: wrong.split('|').map(s => s.trim()), t: { ru, uk, sk } }));

const tr = P => P.t[getLang()] || '';
const PROPER = /^(I|I’m|I’d|I’ve|Peter|Anna|Tom|Max|London|Bratislava|Ukraine|Slovakia|English|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
// topics 1–8 are A1; topics from A2_TOPIC on are A2 — asked only at the A2 level (home screen)
const A2_TOPIC = 9;
const levelOk = x => getProfile().level === 'a2' || x.topic < A2_TOPIC;
const inLevel = () => PHRASES.filter(levelOk);
const dialogsInLevel = () => DIALOGS.filter(levelOk);

/** Review mistakes: the phrases with mistakes that suit this mode (ok); none suit — the usual phrases. */
function pool(st, review, ok = () => true) {
  if (review) { const keys = Object.keys(st.mist); const p = inLevel().filter(P => keys.includes(P.key) && ok(P)); if (p.length) return p; }
  return inLevel().filter(ok);
}
/** A phrase with an earlier mistake first (the engine's list for this round), else a random one, not the previous. */
function pick(st, review, prev, due, ok = () => true, seen) {
  while (due && due.length) { const k = due.shift(), P = PHRASES.find(x => x.key === k); if (P && ok(P) && levelOk(P)) return { P, due: true }; }
  let L = pool(st, review, ok);
  // no phrase twice in one round, while there are others left
  if (seen && L.some(P => !seen.has(P.key))) L = L.filter(P => !seen.has(P.key));
  for (let n = 0; n < 50; n++) { const P = rnd(L); if (P !== prev || L.length < 2) return { P }; }
  return { P: rnd(L) };
}

/** The phrase on the card: gaps before k are filled in, gap k is the one to answer (highlighted; typing shows in it),
 *  the gaps after it wait, greyed out. */
function phraseHTML(P, k) {
  let n = -1;
  return `<div class="phrase">${fill(P.parts, g => {
    n++;
    if (n < k) return `<span class="gap done">${esc(g.a)}</span>`;
    const hint = g.h ? `<small>${esc(g.h)}</small>` : '';
    return n === k ? `<span class="gap cur"><span id="gapcur">&nbsp;</span>${hint}</span>` : `<span class="gap later">…${hint}</span>`;
  })}</div>`;
}

const base = (P, isDue, chipKey) => ({
  _raw: P, key: P.key, due: isDue, chips: [{ label: T(chipKey), kind: 'ghost' }], title: tr(P) || '—', subtitle: '', say: '',
  display: P.full, mistake: { text: tr(P) || P.full, form: P.full },
});

/** Fill the gaps, one after another (quiz: pick from the options, type: write it). */
function gapStep(P, k, mode, isDue) {
  const g = P.gaps[k], b = base(P, isDue, 'phGap');
  // two gaps: say which one is asked now
  if (P.gaps.length > 1) b.chips = [...b.chips, { label: T('phGapN').replace('{n}', k + 1).replace('{m}', P.gaps.length), kind: 'warm' }];
  return { ...b,
    main: () => phraseHTML(P, k),
    options: mode === 'type' ? null : shuf([g.a, ...g.w]).map(f => ({ label: esc(f), value: f })),
    answer: g.a, accepted: [g.a],
    then: k + 1 < P.gaps.length ? () => gapStep(P, k + 1, mode, isDue) : undefined };
}

/** Find the mistake: one gap gets a wrong form; tap the wrong word, then pick the right one. */
function fixTask(P, isDue) {
  const k = Math.floor(Math.random() * P.gaps.length), g = P.gaps[k], wrong = rnd(g.w);
  const MARK = '\u0001';
  const words = fill(P.parts, (x, i) => (x === g ? MARK + wrong : x.a)).split(' ');
  const at = words.findIndex(w => w.includes(MARK));
  const shown = words.map(w => w.replace(MARK, ''));
  const struck = shown.map((w, i) => (i === at ? `<span class="bad">${esc(w)}</span>` : esc(w))).join(' ');
  return { ...base(P, isDue, 'phFix'),
    // the English phrase with the mistake is on the card; each word is a button
    main: () => `<div class="phrase">${shown.map((w, i) => `<button type="button" class="opt w" data-act="ans" data-v="${i}">${esc(w)}</button>`).join(' ')}</div>
      <p class="label" style="margin:0">${T('phFixQ')}</p>`,
    inCard: true, options: shown.map((w, i) => ({ label: esc(w), value: String(i) })), answer: String(at),
    then: () => ({ ...base(P, isDue, 'phFix'),
      main: () => `<div class="phrase">${struck}</div><p class="label" style="margin:0">${T('phFixQ2')}</p>`,
      options: shuf([g.a, ...g.w.filter(w => w !== wrong)]).map(f => ({ label: esc(f), value: f })), answer: g.a, accepted: [g.a] }) };
}

/** Build the phrase from its shuffled words (only phrases whose word order is clear, P.alts). */
function orderTask(P, isDue) {
  const words = P.full.replace(/[.?!]+$/, '').split(' ');
  if (!PROPER.test(words[0])) words[0] = words[0][0].toLowerCase() + words[0].slice(1);
  let mixed = shuf(words);
  for (let n = 0; n < 10 && mixed.join(' ') === words.join(' '); n++) mixed = shuf(words);
  return { ...base(P, isDue, 'phOrder'), main: () => '', order: mixed, options: null, accepted: P.alts, answer: P.full };
}

/** Translation: the phrase in your language, pick the English one; the wrong ones differ in one form. */
function translateTask(P, isDue) {
  const variants = [];
  P.gaps.forEach(g => g.w.forEach(w => variants.push(fill(P.parts, x => (x === g ? w : x.a)))));
  const wrong = shuf([...new Set(variants)].filter(v => v !== P.full)).slice(0, 3);
  return { ...base(P, isDue, 'phTr'), main: () => `<p class="label" style="margin:0">${T('phTrQ')}</p>`,
    wide: true, options: shuf([P.full, ...wrong]).map(f => ({ label: esc(f), value: f })), answer: P.full };
}

/** Dialogue: a line is said to you, pick the reply that fits. */
function dialogTask(D, isDue) {
  const [line, reply] = (tr(D) || '').split(' — ');
  return { _raw: D, key: D.key, due: isDue, chips: [{ label: T('phDlg'), kind: 'ghost' }], title: esc(D.line), say: D.line, subtitle: line || '',
    main: () => `<p class="label" style="margin:0">${T('phDlgQ')}</p>`, wide: true,
    options: shuf([D.reply, ...D.wrong]).map(f => ({ label: esc(f), value: f })), answer: D.reply, display: D.reply,
    mistake: { text: D.line, form: D.reply + (reply ? ` (${reply})` : '') } };
}
function pickDialog(st, review, prev, due, seen) {
  while (due && due.length) { const k = due.shift(), D = DIALOGS.find(x => x.key === k); if (D && levelOk(D)) return { D, due: true }; }
  const keys = review ? Object.keys(st.mist) : [], DL = dialogsInLevel();
  let L = review && DL.some(D => keys.includes(D.key)) ? DL.filter(D => keys.includes(D.key)) : DL;
  if (seen && L.some(D => !seen.has(D.key))) L = L.filter(D => !seen.has(D.key));
  for (let n = 0; n < 50; n++) { const D = rnd(L); if (D !== prev || L.length < 2) return { D }; }
  return { D: rnd(L) };
}

/** Dictation: the phrase is said; the first letter of every word is shown, the others are tapped in. */
const ABC = 'abcdefghijklmnopqrstuvwxyz';
function dictTask(P, isDue) {
  let start = true;
  const letters = [...P.full].map(c => {
    const isLetter = /\p{L}/u.test(c), show = !isLetter || start;
    start = !isLetter;
    return { c, show };
  });
  const need = [...new Set(letters.filter(l => !l.show).map(l => l.c.toLowerCase()))];
  const extra = shuf([...ABC].filter(c => !need.includes(c) && /[a-z]/.test(c))).slice(0, Math.max(0, Math.min(3, 16 - need.length)));
  const keys = [...need, ...extra].sort((a, b) => ABC.indexOf(a) - ABC.indexOf(b));
  return { ...base(P, isDue, 'phDict'), main: () => '<div class="phrase dict" id="dict"></div>',
    letters, keys, listen: P.full, options: null, answer: P.full };
}

// "Build the phrase": phrases with a clear word order (P.alts) and at least 3 words
const ORDERABLE = P => P.alts && P.full.split(' ').length >= 3;

const MODES_ALL = ['quiz', 'type', 'fix', 'order', 'translate', 'dialog', 'dict'];

export default {
  id: 'phrases',
  glyph: '„…“',
  titleKey: 'phT',
  descKey: 'phD',
  strings,
  defaults: { best: {}, mist: {} },
  // the dictation needs an English voice
  get modes() { return MODES_ALL.filter(m => m !== 'dict' || canSpeak()); },

  summary() { return `${T('phN')}: <b>${inLevel().length}</b> · ${T('phDlgN')}: <b>${dialogsInLevel().length}</b> · ${getProfile().level === 'a2' ? 'A1–A2' : 'A1'}`; },

  question(mode, st, { review, prev, due, seen }) {
    const last = prev && prev._raw;
    if (mode === 'dialog') { const { D, due: d } = pickDialog(st, review, last, due, seen); return dialogTask(D, d); }
    // dialogue keys in the mistakes list belong to the "Dialogue" mode: the phrase modes skip them
    if (due) for (let i = due.length - 1; i >= 0; i--) if (due[i].startsWith('d:')) due.splice(i, 1);
    if (mode === 'order') { const { P, due: d } = pick(st, review, last, due, ORDERABLE, seen); return orderTask(P, d); }
    if (mode === 'translate') { const { P, due: d } = pick(st, review, last, due, undefined, seen); return translateTask(P, d); }
    if (mode === 'dict') { const { P, due: d } = pick(st, review, last, due, undefined, seen); return dictTask(P, d); }
    // "Find the mistake" needs at least two words to choose from
    if (mode === 'fix') { const { P, due: d } = pick(st, review, last, due, x => x.full.includes(' '), seen); return fixTask(P, d); }
    const { P, due: d } = pick(st, review, last, due, undefined, seen);
    return gapStep(P, 0, mode, d);
  },

  referenceTitleKey: 'phRef',
  mountReference(el) {
    el.innerHTML = `<input class="search" id="q" type="search" placeholder="${T('phSearch')}" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="plist" id="pl"></div>`;
    const pl = el.querySelector('#pl'), q = el.querySelector('#q');
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const draw = () => {
      const s = norm(q.value.trim());
      const item = (en, t) => `<div class="pitem"><b>${esc(en)}</b>${sayButton(en)}${t ? `<span>${esc(t)}</span>` : ''}</div>`;
      const hit = text => !s || norm(text).includes(s);
      pl.innerHTML = PHRASES.filter(P => hit(P.full + ' ' + Object.values(P.t).join(' '))).map(P => item(P.full, tr(P))).join('')
        + `<p class="label" style="margin:12px 0 0">${T('phDlgN')}</p>`
        + DIALOGS.filter(D => hit(`${D.line} ${D.reply} ${Object.values(D.t).join(' ')}`)).map(D => item(`${D.line} — ${D.reply}`, tr(D))).join('');
    };
    q.addEventListener('input', draw); draw();
  },
};
