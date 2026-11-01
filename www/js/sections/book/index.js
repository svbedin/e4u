/*!
 * E4U — section "My coursebook": the words and the grammar of the unit the player is working through now
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. The player picks the coursebook and the unit in the
 * section menu (a child doing Complete Key for Schools, unit 2, trains exactly that). Task keys:
 * "w:<book>:<unit>:<word>" and "g:<book>:<unit>:<sentence>", so a mistake comes back in the same unit.
 */
import { BOOKS, parseGap } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { sayButton } from '../../core/ui.js';
import { canSpeak } from '../../core/speech.js';

export const STAGES = ['word', 'gram'];
const STAGE_KEY = { word: 'bWords', gram: 'bGram' };
const tr = t => t[getLang()] || t.ru;

/** Every task of every unit, built once: words { key, en, t } and sentences { key, gap, t }. */
const UNITS = {};
for (const [b, B] of Object.entries(BOOKS)) {
  for (const [n, U] of Object.entries(B.units)) {
    UNITS[`${b}:${n}`] = {
      word: U.words.map(([en, ru, uk, sk]) => ({ key: `w:${b}:${n}:${en}`, en, t: { ru, uk, sk } })),
      gram: U.gram.map(([s, ru, uk, sk]) => { const gap = parseGap(s); return { key: `g:${b}:${n}:${gap.full}`, gap, t: { ru, uk, sk } }; }),
    };
  }
}
const ALL = Object.values(UNITS).flatMap(U => [...U.word.map(x => ({ ...x, s: 'word' })), ...U.gram.map(x => ({ ...x, s: 'gram' }))]);
const byKey = k => ALL.find(x => x.key === k) || null;
const unitOf = st => UNITS[`${st.book}:${st.unit}`] || Object.values(UNITS)[0];
const active = st => (st.stages.length ? st.stages : ['word']);
// a clock time or a number has other clock times or numbers as wrong options, a word has other words
const isNum = x => /^[\d:]+$/.test(x.t.ru);
let state = null;  // the section's saved state (set in init): the hub summary and the word list show the chosen unit

function pick(st, review, due, seen) {
  const U = unitOf(st), ss = active(st), inUnit = x => ss.includes(x.s) && x.key.startsWith(`${x.key[0]}:${st.book}:${st.unit}:`);
  while (due && due.length) { const it = byKey(due.shift()); if (it && inUnit(it)) return { ...it, due: true }; }
  if (review) {
    const L = Object.keys(st.mist).map(byKey).filter(it => it && inUnit(it));
    const left = L.filter(it => !seen || !seen.has(it.key));
    if (L.length) return rnd(left.length ? left : L);
  }
  const pool = ss.flatMap(s => U[s].map(x => ({ ...x, s })));
  const fresh = pool.filter(x => !seen || !seen.has(x.key));
  return rnd(fresh.length ? fresh : pool);
}

export default {
  id: 'book',
  glyph: 'book',
  titleKey: 'bookT',
  descKey: 'bookD',
  strings,
  defaults: { book: 'ket', unit: 1, stages: [...STAGES], best: {}, mist: {} },
  modes: ['quiz', 'type', 'match', 'blitz'],

  normalize(st) {
    if (!BOOKS[st.book]) st.book = Object.keys(BOOKS)[0];
    if (!BOOKS[st.book].units[st.unit]) st.unit = Number(Object.keys(BOOKS[st.book].units)[0]);
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
  },

  settingsHTML(st) {
    const B = BOOKS[st.book];
    const book = b => `<button class="chip" data-act="book:book" data-v="${b}" aria-pressed="${st.book === b}">${esc(BOOKS[b].title)} <small class="lvl-tag">${BOOKS[b].level}</small></button>`;
    const unit = n => `<button class="chip" data-act="book:unit" data-v="${n}" aria-pressed="${String(st.unit) === n}">${n}. ${esc(B.units[n].title)}</button>`;
    // the units not written yet: greyed out with "soon"
    const soon = Object.entries(B.soon || {}).map(([n, t]) => `<button class="chip" disabled aria-disabled="true" style="opacity:.55">${n}. ${esc(t)} <small class="lvl-tag">${T('soon')}</small></button>`).join('');
    const stage = s => `<button class="chip" data-act="book:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${T(STAGE_KEY[s])}</button>`;
    return `<div class="group"><span class="label">${T('bBook')}</span><div class="chips">${Object.keys(BOOKS).map(book).join('')}</div></div>
      <div class="group"><span class="label">${T('bUnit')}</span><div class="chips">${Object.keys(B.units).map(unit).join('')}${soon}</div></div>
      <div class="group"><span class="label">${T('bStages')}</span><div class="chips">${STAGES.map(stage).join('')}</div></div>`;
  },

  summary() {
    const s = state ? state() : this.defaults, B = BOOKS[s.book] || BOOKS.ket;
    return `${esc(B.title)} · ${T('bUnit')} <b>${s.unit}</b>`;
  },

  init({ on, st, save, rerender }) {
    state = st;
    on('book:book', v => { const s = st(); if (BOOKS[v]) { s.book = v; s.unit = Number(Object.keys(BOOKS[v].units)[0]); } save(); rerender(); });
    on('book:unit', v => { const s = st(); if (BOOKS[s.book].units[v]) s.unit = Number(v); save(); rerender(); });
    // the last stage stays on
    on('book:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st, { review, due, seen }) {
    const it = pick(st, review, due, seen), U = unitOf(st), common = { key: it.key, due: !!it.due, chips: [{ label: T(STAGE_KEY[it.s]), kind: 'ghost' }] };
    if (it.s === 'gram') {
      const { gap } = it;
      return { ...common, title: esc(tr(it.t)), subtitle: '', say: '',
        main: revealed => `<div class="phrase">${esc(gap.before)}<span class="gap${revealed ? ' done' : ' cur'}">${revealed ? esc(gap.a) : '<span id="gapcur">&nbsp;</span>'}</span>${esc(gap.after)}</div><p class="label" style="margin:6px 0 0">${T('bGapQ')}</p>`,
        wide: [gap.a, ...gap.w].some(f => f.length > 14),
        options: mode === 'type' ? null : shuf([gap.a, ...gap.w]).map(f => ({ label: esc(f), value: f })),
        answer: gap.a, accepted: [gap.a], display: gap.full, sayAfter: gap.full, mistake: { text: tr(it.t), form: gap.full } };
    }
    const wrong = shuf(U.word.filter(x => x.en !== it.en && tr(x.t) !== tr(it.t) && isNum(x) === isNum(it))).slice(0, 3).map(x => x.en);
    return { ...common, title: esc(tr(it.t)), subtitle: '', say: '',
      main: revealed => `<div class="slot"><u>${revealed ? esc(it.en) : '&nbsp;&nbsp;&nbsp;'}</u></div><p class="label" style="margin:6px 0 0">${T('bWordQ')}</p>`,
      wide: [it.en, ...wrong].some(f => f.length > 14),
      options: mode === 'type' ? null : shuf([it.en, ...wrong]).map(f => ({ label: esc(f), value: f })),
      answer: it.en, accepted: [it.en, ...U.word.filter(x => x.en !== it.en && tr(x.t) === tr(it.t)).map(x => x.en)], display: it.en, sayAfter: it.en,
      mistake: { text: tr(it.t), form: it.en } };
  },

  /** Pairs: six words of the unit and their meaning. */
  matchSet(st) {
    const U = unitOf(st), used = new Set(), pairs = [];
    for (const x of shuf(U.word)) {
      const right = tr(x.t);
      if (used.has(right) || pairs.length >= 6) continue;
      used.add(right);
      pairs.push({ key: x.key, left: esc(x.en), right, mistake: { text: right, form: x.en } });
    }
    return { key: pairs[0].key, due: false, chips: [], title: `${T('bUnit')} ${st.unit}`, subtitle: '', say: '', hint: T('bPairs'), pairs };
  },

  referenceTitleKey: 'bRef',
  mountReference(el) {
    const st = state ? state() : this.defaults, U = unitOf(st), B = BOOKS[st.book] || BOOKS.ket;
    el.innerHTML = `<p class="note">${esc(B.title)} · ${T('bUnit')} ${st.unit}. ${esc((B.units[st.unit] || {}).title || '')}</p>
      <p class="label" style="margin:12px 0 0">${T('bWords')}</p>
      <div class="plist">${U.word.map(x => `<div class="pitem"><b>${esc(x.en)}${canSpeak() ? sayButton(x.en) : ''}</b><span>${esc(tr(x.t))}</span></div>`).join('')}</div>
      <p class="label" style="margin:12px 0 0">${T('bGram')}</p>
      <div class="plist">${U.gram.map(x => `<div class="pitem"><b>${esc(x.gap.full)}</b><span>${esc(tr(x.t))}</span></div>`).join('')}</div>`;
  },
};
