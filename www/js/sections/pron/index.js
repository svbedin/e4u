/*!
 * E4U — section "Pronouns": I — me — my — mine (who? whom? whose?), in sentences; myself (A2)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. A task key is "f:she:obj" (a form: she → her)
 * or "s:<sentence>" (a gap in a sentence), so a mistake comes back as the same task.
 */
import { COLS, FORMS, SENTENCES } from './data.js';
import strings from './strings.js';
import { T, getLang } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { canSpeak } from '../../core/speech.js';
import { getProfile } from '../../core/store.js';

export const STAGES = ['forms', 'sent', 'refl'];
const A2_STAGES = ['refl'];
const STAGE_KEY = { forms: 'pForms', sent: 'pSent', refl: 'pRefl' };
const COL_KEY = { subj: 'pSubj', obj: 'pObj', poss: 'pPoss', pron: 'pPron', refl: 'pReflC' };
const levelStages = () => STAGES.filter(s => getProfile().level === 'a2' || !A2_STAGES.includes(s));
const active = st => { const ss = st.stages.filter(s => levelStages().includes(s)); return ss.length ? ss : ['forms']; };

/** "Can you help {me|I|my,mine}?" → { before, a, h, w, after } */
function parse(s) {
  const m = s.match(/^(.*)\{([^|}]*)\|([^|}]*)\|([^}]*)\}(.*)$/);
  return { before: m[1], a: m[2], h: m[3], w: m[4].split(','), after: m[5] };
}
export const SENT = SENTENCES.map(([stage, en, ru, uk, sk]) => {
  const g = parse(en);
  return { stage, ...g, full: g.before + g.a + g.after, t: { ru, uk, sk }, key: 's:' + g.before + g.a + g.after };
});

/** A task from its key; null if the key is not (or no longer) valid. */
function item(key) {
  if (key.startsWith('s:')) { const S = SENT.find(x => x.key === key); return S ? { key, stage: S.stage, S } : null; }
  const [, subj, col] = key.split(':'), P = FORMS.find(x => x.subj === subj);
  if (!P || !COLS.includes(col) || col === 'subj' || !P[col]) return null;
  return { key, stage: col === 'refl' ? 'refl' : 'forms', P, col };
}
function fresh(st) {
  const s = rnd(st.stages);
  // the sentences and the forms half and half in "myself"
  if (s === 'sent' || (s === 'refl' && Math.random() < 0.5)) return item(rnd(SENT.filter(x => x.stage === s)).key);
  const P = rnd(FORMS), col = s === 'refl' ? 'refl' : rnd(['obj', 'poss', 'pron']);
  return item(`f:${P.subj}:${col}`) || item(`f:${P.subj}:obj`);
}
/** An earlier mistake first; in "Review mistakes" only those; never the same task twice in a round. */
function pick(st, review, due, seen) {
  while (due && due.length) { const it = item(due.shift()); if (it && st.stages.includes(it.stage)) return { ...it, due: true }; }
  if (review) {
    const L = Object.keys(st.mist).map(item).filter(it => it && st.stages.includes(it.stage));
    const left = L.filter(it => !seen || !seen.has(it.key));
    if (L.length) return rnd(left.length ? left : L);
  }
  for (let i = 0; i < 50; i++) { const it = fresh(st); if (!seen || !seen.has(it.key)) return it; }
  return fresh(st);
}

/** Wrong forms for "she → her (object)": her other forms and this column of the other persons — never the answer itself. */
function formWrong(P, col) {
  const right = P[col];
  const own = COLS.filter(c => c !== col).map(c => P[c]);
  const others = shuf(FORMS.filter(x => x !== P)).map(x => x[col]);
  return [...new Set([...shuf(own), ...others])].filter(f => f && f !== right);
}

export default {
  id: 'pron',
  glyph: 'I·me',
  titleKey: 'pronT',
  descKey: 'pronD',
  strings,
  defaults: { stages: [...STAGES], best: {}, mist: {} },
  modes: ['quiz', 'type', 'match', 'blitz'],

  normalize(st) {
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
  },

  settingsHTML(st) {
    const chip = s => `<button class="chip" data-act="pron:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${T(STAGE_KEY[s])}${
      A2_STAGES.includes(s) ? ' <small class="lvl-tag">A2</small>' : ''}</button>`;
    return `<div class="group"><span class="label">${T('pStages')}</span><div class="chips">${levelStages().map(chip).join('')}</div></div>`;
  },

  summary() { return `I — me — my — mine · ${T('pSent')}: <b>${SENT.filter(x => levelStages().includes(x.stage)).length}</b> · ${getProfile().level === 'a2' ? 'A1–A2' : 'A1'}`; },

  init({ on, st, save, rerender }) {
    // the last stage of the level stays on
    on('pron:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.filter(x => levelStages().includes(x)).length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st0, { review, due, seen }) {
    const st = { ...st0, stages: active(st0) };
    const it = pick(st, review, due, seen), common = { key: it.key, due: !!it.due };
    if (it.S) {
      // a sentence with a gap: the translation on top, the subject pronoun of the person meant under the gap
      const S = it.S;
      return { ...common, chips: [{ label: T(STAGE_KEY[it.stage]), kind: 'ghost' }], title: esc(S.t[getLang()] || ''), subtitle: '', say: '',
        main: revealed => `<div class="phrase">${esc(S.before)}<span class="gap${revealed ? ' done' : ' cur'}">${revealed ? esc(S.a) : '<span id="gapcur">&nbsp;</span>'}<small>${esc(S.h)}</small></span>${esc(S.after)}</div><p class="label" style="margin:6px 0 0">${T('pGapQ')}</p>`,
        options: mode === 'type' ? null : shuf([S.a, ...S.w]).map(f => ({ label: esc(f), value: f })),
        answer: S.a, accepted: [S.a], display: S.full, sayAfter: S.full, mistake: { text: S.t[getLang()] || S.full, form: S.full } };
    }
    const { P, col } = it, right = P[col];
    return { ...common, chips: [{ label: T(COL_KEY[col]), kind: 'ghost' }], title: esc(P.subj), subtitle: '', say: P.subj,
      main: revealed => `<div class="slot">${esc(P.subj)} → <u>${revealed ? esc(right) : '&nbsp;&nbsp;&nbsp;'}</u></div><p class="label" style="margin:6px 0 0">${T(COL_KEY[col])}</p>`,
      options: mode === 'type' ? null : shuf([right, ...formWrong(P, col).slice(0, 3)]).map(f => ({ label: esc(f), value: f })),
      answer: right, accepted: [right], display: `${P.subj} → ${right}`, sayAfter: right, mistake: { text: `${P.subj} · ${T(COL_KEY[col])}`, form: right } };
  },

  /** Pairs: the seven persons and one of their forms (me, my, mine — or myself at A2). */
  matchSet(st0) {
    const st = { ...st0, stages: active(st0) };
    const col = st.stages.includes('refl') && Math.random() < 0.3 ? 'refl' : rnd(['obj', 'poss', 'pron']);
    const rows = shuf(FORMS.filter(P => P[col])).slice(0, 6);
    return { key: `f:${rows[0].subj}:${col}`, due: false, chips: [], title: T(COL_KEY[col]), subtitle: '', say: '', hint: T('pPairs'),
      pairs: rows.map(P => ({ key: `f:${P.subj}:${col}`, left: esc(P.subj), right: P[col], mistake: { text: `${P.subj} · ${T(COL_KEY[col])}`, form: P[col] } })) };
  },

  referenceTitleKey: 'pRef',
  mountReference(el) {
    const cell = f => (!f ? '<td>—</td>' : canSpeak() ? `<td class="sayf" data-act="say" data-v="${esc(f)}">${esc(f)}</td>` : `<td>${esc(f)}</td>`);
    // one block per person: I — me — my — mine — myself; then the sentences
    el.innerHTML = `<p class="note">${T('pRefNote')}</p><div class="vlist">
      ${FORMS.map((P, i) => `<details class="v"${i === 0 ? ' open' : ''}><summary>${esc(COLS.map(c => P[c]).filter(Boolean).join(' — '))}</summary>
        <div class="tables"><table>${COLS.map(c => `<tr><td>${T(COL_KEY[c])}</td>${cell(P[c])}</tr>`).join('')}</table></div></details>`).join('')}</div>
      <p class="label" style="margin:12px 0 0">${T('pSent')}</p><div class="plist">${SENT.map(S => `<div class="pitem"><b>${esc(S.full)}</b><span>${esc(S.t[getLang()] || '')}</span></div>`).join('')}</div>`;
  },
};
