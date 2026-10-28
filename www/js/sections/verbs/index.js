/*!
 * E4U — section "Verbs": to be, Present Simple, Present Continuous, Past Simple, past participle (A2)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. Every form comes from data.js;
 * the wrong options are other forms of the same verb and the mistakes learners make (goed, gos, stoping).
 */
import { VERBS, PERS, BE, STAGES, A2_STAGES, formFor, fits, wrongForms } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { sayButton } from '../../core/ui.js';
import { canSpeak } from '../../core/speech.js';
import { getProfile } from '../../core/store.js';

const STAGE_EN = { be: 'to be', pres: 'Present Simple', cont: 'Present Continuous', past: 'Past Simple', pp: 'Past participle' };
const STAGE_KEY = { be: 'vBe', pres: 'vPres', cont: 'vCont', past: 'vPast', pp: 'vPp' };
// a word that shows the time of the action, under the gap
const WHEN = { be: '', pres: 'every day', cont: 'now', past: 'yesterday', pp: 'already' };
const tr = V => V.t[getLang()] || '';
const levelStages = () => STAGES.filter(s => getProfile().level === 'a2' || !A2_STAGES.includes(s));
const active = st => { const ss = st.stages.filter(s => levelStages().includes(s)); return ss.length ? ss : ['pres']; };
/** Verbs of the app-wide language level (home screen): A1 only, or A1 + A2. */
const inLevel = () => (getProfile().level === 'a1' ? VERBS.filter(V => V.a) : VERBS);

function pool(st, review, ok) {
  if (review) { const keys = Object.keys(st.mist); const p = VERBS.filter(V => keys.includes(V.v) && ok(V)); if (p.length) return p; }
  return inLevel().filter(ok);
}
function chips(s) {
  return [{ label: STAGE_EN[s] }, { label: T(STAGE_KEY[s]), kind: 'ghost' }];
}

/** A verb + stage + person; verbs with an earlier mistake first, not the same verb twice in a round. */
function pick(st, review, prev, due, seen) {
  const ok = V => st.stages.some(s => fits(V, s));
  while (due && due.length) {
    const k = due.shift(), V = VERBS.find(x => x.v === k);
    if (V && ok(V)) return { V, s: rnd(st.stages.filter(s => fits(V, s))), p: rnd(PERS), due: true };
  }
  const P = pool(st, review, ok);
  for (let n = 0; n < 300; n++) {
    // "to be" is one verb: its stage is chosen as often as the others, not once in a hundred verbs
    const s = rnd(st.stages), V = s === 'be' ? VERBS.find(x => x.v === 'be') : rnd(P.filter(x => fits(x, s)));
    if (!V || !fits(V, s)) continue;
    if (seen && seen.has(V.v) && s !== 'be' && n < 200) continue;
    const p = rnd(PERS);
    if (prev && prev.V === V && prev.s === s && prev.p === p) continue;
    return { V, s, p };
  }
  throw new Error('No verb matches the current settings');
}

function options(V, s, p, form, alts) {
  const wrong = shuf([...new Set(wrongForms(V, s, p))].filter(f => f !== form && !alts.includes(f)));
  return shuf([form, ...wrong.slice(0, 3)]).map(f => ({ label: esc(f), value: f }));
}

export default {
  id: 'verbs',
  glyph: '-ed',
  titleKey: 'verbsT',
  descKey: 'verbsD',
  strings,
  defaults: { stages: [...STAGES], best: {}, mist: {} },
  modes: ['quiz', 'type', 'match', 'blitz'],

  normalize(st) {
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
  },

  settingsHTML(st) {
    const chip = s => `<button class="chip" data-act="verbs:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${STAGE_EN[s]}${
      A2_STAGES.includes(s) ? ' <small class="lvl-tag">A2</small>' : ''}<br><small>${T(STAGE_KEY[s])}</small></button>`;
    return `<div class="group"><span class="label">${T('vStages')}</span><div class="chips">${levelStages().map(chip).join('')}</div></div>`;
  },

  summary() { return `${T('verbs')}: <b>${inLevel().length}</b> · ${getProfile().level === 'a2' ? 'A1–A2' : 'A1'}`; },

  init({ on, st, save, rerender }) {
    // the last stage of the level stays on
    on('verbs:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.filter(x => levelStages().includes(x)).length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st0, { review, prev, due, seen }) {
    const st = { ...st0, stages: active(st0) };
    const { V, s, p, due: isDue } = pick(st, review, prev && prev._raw, due, seen);
    const { lead, form, alts } = formFor(V, s, p), say = `${lead} ${form}`;
    return {
      _raw: { V, s, p }, key: V.v, due: isDue, chips: chips(s), title: V.v, subtitle: tr(V),
      main: revealed => `<div class="slot">${esc(lead)} <u>${revealed ? esc(form) : '&nbsp;&nbsp;&nbsp;'}</u></div>${WHEN[s] ? `<p class="label" style="margin:6px 0 0">${WHEN[s]}</p>` : ''}`,
      options: mode === 'type' ? null : options(V, s, p, form, alts),
      answer: form, accepted: [form, ...alts, say], display: [form, ...alts].length > 1 ? `${lead} ${[form, ...alts].join(' / ')}` : say, sayAfter: say,
      mistake: { text: `${V.v} · ${lead} ___ · ${STAGE_EN[s]}`, form: say },
    };
  },

  matchSet(st0, { review, due }) {
    const st = { ...st0, stages: active(st0) };
    const s = rnd(st.stages);
    if (s === 'be') {
      const tense = rnd(['pres', 'past']);
      return { key: 'be', due: false, chips: chips(s), title: tense === 'pres' ? 'to be' : 'to be · Past Simple', subtitle: T('vBe'), hint: T('vPairs'),
        pairs: PERS.map(p => ({ key: `be:${p}`, left: p, right: BE[tense][p], mistake: { text: `be · ${p}`, form: `${p} ${BE[tense][p]}` } })) };
    }
    const D = (due || []).map(k => VERBS.find(x => x.v === k)).filter(V => V && fits(V, s) && V.v !== 'be').slice(0, 6);
    D.forEach(V => due.splice(due.indexOf(V.v), 1));
    let P = pool(st, review, V => fits(V, s) && V.v !== 'be' && !D.includes(V));
    // pairs of equal words teach nothing: for the past and the participle, irregular verbs (or forms that differ)
    if (s === 'past' || s === 'pp') { const irr = P.filter(V => V.irr && V.v !== V[s][0]); if (irr.length >= 6) P = irr; }
    const words = [...D, ...shuf(P)].slice(0, 6), p = s === 'pres' ? rnd(['he', 'she']) : 'I';
    return {
      key: words[0].v, due: D.length > 0, chips: chips(s), title: STAGE_EN[s], subtitle: T(STAGE_KEY[s]), say: '', hint: T('vPairs'),
      pairs: words.map(V => { const f = formFor(V, s, p); return { key: V.v, left: V.v, right: f.form, mistake: { text: `${V.v} · ${STAGE_EN[s]}`, form: `${f.lead} ${f.form}` } }; }),
    };
  },

  referenceTitleKey: 'vRef',
  mountReference(el) {
    el.innerHTML = `<input class="search" id="q" type="search" placeholder="${T('vSearch')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <p class="note">${T('vRefNote')}</p><div class="vlist" id="vl"></div>`;
    const vl = el.querySelector('#vl'), q = el.querySelector('#q');
    const cell = f => (canSpeak() ? `<td class="sayf" data-act="say" data-v="${esc(f)}">${esc(f)}</td>` : `<td>${esc(f)}</td>`);
    const table = V => `<table>${(V.v === 'be'
      ? [['I / he / she', 'am / is'], ['you / we / they', 'are'], ['Past Simple', 'was / were'], ['Past participle', 'been'], ['-ing', 'being']]
      : [['he / she', V.s], ['Past Simple', V.past.join(' / ')], ['Past participle', V.pp.join(' / ')], ['-ing', V.ing.join(' / ')]])
      .map(([a, b]) => `<tr><td>${a}</td>${cell(b)}</tr>`).join('')}</table>`;
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      vl.innerHTML = VERBS.filter(V => !s || V.v.includes(s) || [V.s, ...V.past, ...V.pp].some(f => f.includes(s)) || Object.values(V.t).join(' ').toLowerCase().includes(s))
        .sort((a, b) => a.v.localeCompare(b.v, 'en'))
        .map(V => `<details class="v"><summary>${V.v}${sayButton(V.v)}${V.irr ? ` <small class="pill">${T('vIrr')}</small>` : ''}${!V.a ? ' <small class="pill" style="background:transparent">A2</small>' : ''}<span>${esc(tr(V))}</span></summary><div class="tables">${table(V)}</div></details>`).join('');
    };
    q.addEventListener('input', draw); draw();
    vl.addEventListener('click', ev => { if (ev.target.closest('summary .say')) ev.preventDefault(); });
  },
};
