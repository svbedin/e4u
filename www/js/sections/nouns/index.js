/*!
 * E4U — section "Nouns": a / an, the plural
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. Every form comes from data.js;
 * the wrong plurals are the mistakes learners make (childs, tomatos, knifes, babys).
 */
import { NOUNS, UNITS, wrongPlurals } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { sayButton } from '../../core/ui.js';
import { canSpeak } from '../../core/speech.js';
import { getProfile } from '../../core/store.js';

export const STAGES = ['art', 'pl'];
const STAGE_EN = { art: 'a / an', pl: 'plural' };
const STAGE_KEY = { art: 'nArt', pl: 'nPl' };
const tr = W => W.t[getLang()] || '';
const inLevel = () => (getProfile().level === 'a1' ? NOUNS.filter(W => W.a) : NOUNS);
// uncountable nouns (water, milk) take no a / an and have no plural: they wait for "some / any"
const fits = (W, s) => !!W.pl;

// the units of the coursebook picked in the section menu (none picked — all words of the level)
const inUnits = st => { const on = (st && st.units) || []; return inLevel().filter(W => !on.length || on.includes(W.u)); };

function pool(st, review, ok) {
  if (review) { const keys = Object.keys(st.mist); const p = NOUNS.filter(W => keys.includes(W.n) && ok(W)); if (p.length) return p; }
  // too few words in the units picked for this task (pairs need six): all words of the level
  const p = inUnits(st).filter(ok);
  return p.length >= 6 ? p : inLevel().filter(ok);
}
const chips = s => [{ label: STAGE_EN[s] }, { label: T(STAGE_KEY[s]), kind: 'ghost' }];

function pick(st, review, prev, due, seen) {
  const ok = W => st.stages.some(s => fits(W, s));
  while (due && due.length) { const k = due.shift(), W = NOUNS.find(x => x.n === k); if (W && ok(W)) return { W, s: rnd(st.stages), due: true }; }
  const P = pool(st, review, ok);
  for (let n = 0; n < 300; n++) {
    const W = rnd(P);
    if ((prev && prev.W === W && P.length > 1) || (seen && seen.has(W.n) && n < 250)) continue;
    return { W, s: rnd(st.stages) };
  }
  throw new Error('No noun matches the current settings');
}

export default {
  id: 'nouns',
  glyph: 'a/an',
  titleKey: 'nounsT',
  descKey: 'nounsD',
  strings,
  defaults: { stages: [...STAGES], units: [], best: {}, mist: {} },
  modes: ['quiz', 'type', 'match', 'blitz'],

  normalize(st) {
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
    st.units = (st.units || []).filter(u => UNITS.includes(u));
  },

  settingsHTML(st) {
    const chip = s => `<button class="chip" data-act="nouns:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${STAGE_EN[s]}<br><small>${T(STAGE_KEY[s])}</small></button>`;
    // the words of the coursebook's units, like the lessons' topics in "Phrases"
    const unit = u => `<button class="chip" data-act="nouns:unit" data-v="${u}" aria-pressed="${st.units.includes(u)}">${u}. ${T('nUnit' + u)}</button>`;
    return `<div class="group"><span class="label">${T('nStages')}</span><div class="chips">${STAGES.map(chip).join('')}</div></div>
      <div class="group"><span class="label">${T('nUnits')}</span><div class="chips"><button class="chip" data-act="nouns:unit" data-v="0" aria-pressed="${!st.units.length}">${T('nAllUnits')}</button>${UNITS.map(unit).join('')}</div></div>`;
  },

  summary() { return `${T('nWords')}: <b>${inLevel().filter(W => W.pl).length}</b> · ${getProfile().level === 'a2' ? 'A1–A2' : 'A1'}`; },

  init({ on, st, save, rerender }) {
    on('nouns:unit', v => {
      const s = st(), u = Number(v), i = s.units.indexOf(u);
      if (!u) s.units = []; else if (i >= 0) s.units.splice(i, 1); else s.units.push(u);
      save(); rerender();
    });
    on('nouns:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st, { review, prev, due, seen }) {
    const { W, s, due: isDue } = pick(st, review, prev && prev._raw, due, seen);
    const common = { _raw: { W, s }, key: W.n, due: isDue, chips: chips(s), title: W.n, subtitle: tr(W) };
    if (s === 'art') {
      const say = `${W.art} ${W.n}`;
      return { ...common,
        main: revealed => `<div class="slot"><u>${revealed ? W.art : '&nbsp;&nbsp;&nbsp;'}</u> ${esc(W.n)}</div><p class="label" style="margin:6px 0 0">${T('nArtQ')}</p>`,
        options: mode === 'type' ? null : [{ label: 'a', value: 'a' }, { label: 'an', value: 'an' }],
        answer: W.art, accepted: [W.art, say], display: say, sayAfter: say,
        mistake: { text: `${W.n} · a / an`, form: say } };
    }
    const say = `two ${W.pl}`;
    return { ...common,
      main: revealed => `<div class="slot">one ${esc(W.n)} → two <u>${revealed ? esc(W.pl) : '&nbsp;&nbsp;&nbsp;'}</u></div>`,
      options: mode === 'type' ? null : shuf([W.pl, ...shuf(wrongPlurals(W)).slice(0, 3)]).map(f => ({ label: esc(f), value: f })),
      answer: W.pl, accepted: [W.pl, say], display: W.pl, sayAfter: W.pl,
      mistake: { text: `${W.n} · plural`, form: W.pl } };
  },

  matchSet(st, { review, due }) {
    const s = rnd(st.stages);
    const D = (due || []).map(k => NOUNS.find(x => x.n === k)).filter(W => W && fits(W, s)).slice(0, 6);
    D.forEach(W => due.splice(due.indexOf(W.n), 1));
    let P = pool(st, review, W => fits(W, s) && !D.includes(W));
    // the plural: irregular and -es / -ies nouns teach more than the plain -s
    if (s === 'pl') { const hard = P.filter(W => W.pl !== W.n + 's'); if (hard.length >= 6) P = hard; }
    const words = [...D, ...shuf(P)].slice(0, 6);
    return {
      key: words[0].n, due: D.length > 0, chips: [], title: STAGE_EN[s], subtitle: T(STAGE_KEY[s]), say: '', hint: T(s === 'art' ? 'nPairsArt' : 'nPairsPl'),
      pairs: words.map(W => ({ key: W.n, left: W.n, right: s === 'art' ? W.art : W.pl, mistake: { text: `${W.n} · ${STAGE_EN[s]}`, form: s === 'art' ? `${W.art} ${W.n}` : W.pl } })),
    };
  },

  referenceTitleKey: 'nRef',
  mountReference(el) {
    el.innerHTML = `<input class="search" id="q" type="search" placeholder="${T('nSearch')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <p class="note">${T('nRefNote')}</p><div class="vlist" id="vl"></div>`;
    const vl = el.querySelector('#vl'), q = el.querySelector('#q');
    const cell = f => (canSpeak() ? `<td class="sayf" data-act="say" data-v="${esc(f)}">${esc(f)}</td>` : `<td>${esc(f)}</td>`);
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      vl.innerHTML = NOUNS.filter(W => !s || W.n.includes(s) || (W.pl || '').includes(s) || Object.values(W.t).join(' ').toLowerCase().includes(s))
        .sort((a, b) => a.n.localeCompare(b.n, 'en'))
        .map(W => `<details class="v"><summary>${W.pl ? `${W.art} ` : ''}${esc(W.n)}${sayButton(W.n)}${W.irr ? ` <small class="pill">${T('nIrr')}</small>` : ''}<span>${esc(tr(W))}</span></summary>
          <div class="tables"><table><tr><td>${T('nSg')}</td>${cell(W.pl ? `${W.art} ${W.n}` : W.n)}</tr><tr><td>${T('nPl')}</td>${W.pl ? cell(W.pl) : `<td>${T('nNoPl')}</td>`}</tr></table></div></details>`).join('');
    };
    q.addEventListener('input', draw); draw();
    vl.addEventListener('click', ev => { if (ev.target.closest('summary .say')) ev.preventDefault(); });
  },
};
