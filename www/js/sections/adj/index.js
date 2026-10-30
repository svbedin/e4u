/*!
 * E4U — section "Adjectives": the meaning, opposites (big — small), the comparative and superlative (A2)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. Every form comes from data.js. A task key is
 * "<stage>:<adjective>" (opp:big), so a mistake comes back in the same stage.
 */
import { ADJ, compWrong, supWrong } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { sayButton } from '../../core/ui.js';
import { canSpeak } from '../../core/speech.js';
import { getProfile } from '../../core/store.js';

export const STAGES = ['mean', 'opp', 'comp', 'sup'];
const A2_STAGES = ['comp', 'sup'];
const STAGE_KEY = { mean: 'aMean', opp: 'aOpp', comp: 'aComp', sup: 'aSup' };
const tr = A => A.t[getLang()] || '';
const levelStages = () => STAGES.filter(s => getProfile().level === 'a2' || !A2_STAGES.includes(s));
const active = st => { const ss = st.stages.filter(s => levelStages().includes(s)); return ss.length ? ss : ['mean']; };
const fits = (A, s) => (s === 'opp' ? A.opp.length > 0 : s === 'comp' || s === 'sup' ? A.comp.length > 0 : true);
/** Adjectives of the app-wide language level (home screen): A1 only, or A1 + A2. */
const inLevel = () => (getProfile().level === 'a1' ? ADJ.filter(A => A.a1) : ADJ);
const byKey = k => { const [s, a] = k.split(':'); const A = ADJ.find(x => x.a === a); return A && STAGES.includes(s) && fits(A, s) ? { A, s } : null; };

/** An adjective + stage: an earlier mistake first, in "Review mistakes" only those, not the same task twice in a round. */
function pick(st, review, due, seen) {
  while (due && due.length) { const it = byKey(due.shift()); if (it && st.stages.includes(it.s)) return { ...it, due: true }; }
  if (review) {
    const L = Object.keys(st.mist).map(byKey).filter(it => it && st.stages.includes(it.s));
    const left = L.filter(it => !seen || !seen.has(`${it.s}:${it.A.a}`));
    if (L.length) return rnd(left.length ? left : L);
  }
  for (let n = 0; n < 100; n++) {
    const s = rnd(st.stages), A = rnd(inLevel().filter(x => fits(x, s)));
    if (A && (!seen || !seen.has(`${s}:${A.a}`) || n > 80)) return { A, s };
  }
  return { A: ADJ[0], s: 'mean' };
}

/** What is asked: the answer, what is also right, the wrong options, how it is shown. */
function task(A, s) {
  if (s === 'mean') {
    // the meaning in your language → the English word; words with the same meaning (fast, quick) are all right
    const same = ADJ.filter(x => tr(x) === tr(A)).map(x => x.a);
    const wrong = inLevel().filter(x => !same.includes(x.a) && !A.opp.includes(x.a)).map(x => x.a);
    return { right: A.a, accepted: same, wrong: shuf(wrong).slice(0, 3), title: esc(tr(A)), q: 'aMeanQ', shown: '' };
  }
  if (s === 'opp') {
    // not the word itself, not another of its opposites (quiet: noisy — and loud is one too)
    const wrong = inLevel().filter(x => x.a !== A.a && !A.opp.includes(x.a) && !x.opp.includes(A.a)).map(x => x.a);
    return { right: A.opp[0], accepted: A.opp, wrong: shuf(wrong).slice(0, 3), title: esc(A.a), q: 'aOppQ', shown: `${esc(A.a)} ↔ ` };
  }
  if (s === 'comp') return { right: A.comp[0], accepted: A.comp, wrong: shuf(compWrong(A)).slice(0, 3), title: esc(A.a), q: 'aCompQ', shown: `${esc(A.a)} → `, after: ' than' };
  return { right: 'the ' + A.sup[0], accepted: A.sup.flatMap(f => ['the ' + f, f]), wrong: shuf(supWrong(A)).slice(0, 3).map(f => 'the ' + f), title: esc(A.a), q: 'aSupQ', shown: `${esc(A.a)} → ` };
}

export default {
  id: 'adj',
  glyph: 'big',
  titleKey: 'adjT',
  descKey: 'adjD',
  strings,
  defaults: { stages: [...STAGES], best: {}, mist: {} },
  modes: ['quiz', 'type', 'match', 'blitz'],

  normalize(st) {
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
  },

  settingsHTML(st) {
    const chip = s => `<button class="chip" data-act="adj:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${T(STAGE_KEY[s])}${
      A2_STAGES.includes(s) ? ' <small class="lvl-tag">A2</small>' : ''}</button>`;
    return `<div class="group"><span class="label">${T('aStages')}</span><div class="chips">${levelStages().map(chip).join('')}</div></div>`;
  },

  summary() { return `${T('aWords')}: <b>${inLevel().length}</b> · ${getProfile().level === 'a2' ? 'A1–A2' : 'A1'}`; },

  init({ on, st, save, rerender }) {
    // the last stage of the level stays on
    on('adj:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.filter(x => levelStages().includes(x)).length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st0, { review, due, seen }) {
    const st = { ...st0, stages: active(st0) };
    const { A, s, due: isDue } = pick(st, review, due, seen);
    const t = task(A, s), key = `${s}:${A.a}`;
    const say = s === 'mean' ? '' : A.a;
    return { key, due: !!isDue, chips: [{ label: T(STAGE_KEY[s]), kind: 'ghost' }], title: t.title, subtitle: s === 'mean' ? '' : tr(A), say,
      main: revealed => `${t.shown || s !== 'mean' ? `<div class="slot">${t.shown}<u>${revealed ? esc(t.right) : '&nbsp;&nbsp;&nbsp;'}</u>${t.after || ''}</div>` : ''}<p class="label" style="margin:6px 0 0">${T(t.q)}</p>`,
      wide: [t.right, ...t.wrong].some(f => f.length > 14),
      options: mode === 'type' ? null : shuf([t.right, ...t.wrong]).map(f => ({ label: esc(f), value: f })),
      answer: t.right, accepted: t.accepted, display: t.right, sayAfter: t.right,
      mistake: { text: s === 'mean' ? tr(A) : `${A.a} · ${T(STAGE_KEY[s])}`, form: t.right } };
  },

  /** Pairs: six adjectives and their opposites (A1), or their comparatives (A2). */
  matchSet(st0, { review, due }) {
    const st = { ...st0, stages: active(st0).filter(s => s !== 'mean') };
    const s = rnd(st.stages.length ? st.stages : ['opp']), pairs = [], used = new Set();
    const D = (due || []).map(byKey).filter(it => it && it.s === s);
    D.forEach(it => due.splice(due.indexOf(`${s}:${it.A.a}`), 1));
    for (const A of [...D.map(it => it.A), ...shuf(inLevel().filter(x => fits(x, s)))]) {
      const right = s === 'opp' ? A.opp[0] : s === 'comp' ? A.comp[0] : 'the ' + A.sup[0];
      // a word and its opposite are not both on the board (big — small, small — big)
      if (used.has(A.a) || used.has(right) || pairs.length >= 6) continue;
      used.add(A.a); used.add(right);
      pairs.push({ key: `${s}:${A.a}`, left: esc(A.a), right, mistake: { text: `${A.a} · ${T(STAGE_KEY[s])}`, form: right } });
    }
    return { key: pairs[0].key, due: D.length > 0, chips: [], title: T(STAGE_KEY[s]), subtitle: '', say: '', hint: T(s === 'opp' ? 'aPairsOpp' : 'aPairsComp'), pairs };
  },

  referenceTitleKey: 'aRef',
  mountReference(el) {
    el.innerHTML = `<input class="search" id="q" type="search" placeholder="${T('aSearch')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <p class="note">${T('aRefNote')}</p><div class="vlist" id="vl"></div>`;
    const vl = el.querySelector('#vl'), q = el.querySelector('#q');
    const cell = f => (canSpeak() ? `<td class="sayf" data-act="say" data-v="${esc(f)}">${esc(f)}</td>` : `<td>${esc(f)}</td>`);
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      vl.innerHTML = ADJ.filter(A => !s || A.a.includes(s) || tr(A).toLowerCase().includes(s))
        .map(A => `<details class="v"><summary>${esc(A.a)}${sayButton(A.a)}<span>${esc(tr(A))}</span></summary><div class="tables"><table>
          ${A.comp.length ? `<tr><td>${T('aComp')}</td>${cell(A.comp.join(' / '))}</tr><tr><td>${T('aSup')}</td>${cell('the ' + A.sup.join(' / the '))}</tr>` : ''}
          ${A.opp.length ? `<tr><td>${T('aOpp')}</td>${cell(A.opp.join(' / '))}</tr>` : ''}</table></div></details>`).join('');
    };
    q.addEventListener('input', draw); draw();
    vl.addEventListener('click', ev => { if (ev.target.closest('summary .say')) ev.preventDefault(); });
  },
};
